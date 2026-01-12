from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import json
from datetime import datetime
import os
import requests  # Añadido
import base64    # Añadido
from github import Github  # Añadido - necesitarás instalar PyGithub

app = FastAPI(title="API Control Super", description="API para recibir datos de compras")

# Permitir CORS (para que tu web pueda comunicarse)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, pon tu dominio aquí
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de datos para recibir
class Producto(BaseModel):
    fecha: str
    super: str
    producto: str
    cantidad: float
    unidad: str
    marca: str
    precio: float

class Compra(BaseModel):
    productos: List[Producto]

def convertir_fecha_formato(fecha_str):
    """
    Convierte fecha de YYYY-MM-DD a DD/MM/YYYY
    """
    try:
        if '-' in fecha_str:
            parts = fecha_str.split('-')
            if len(parts) == 3:
                # Si es YYYY-MM-DD, convertir a DD/MM/YYYY
                if len(parts[0]) == 4:  # YYYY al principio
                    return f"{parts[2]}/{parts[1]}/{parts[0]}"  # DD/MM/YYYY
                elif len(parts[2]) == 4:  # YYYY al final
                    return f"{parts[0]}/{parts[1]}/{parts[2]}"  # Ya está bien
        return fecha_str
    except Exception:
        return fecha_str

def trigger_github_workflow():
    """Dispara el workflow en GitHub"""
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token:
        print("⚠️  GITHUB_TOKEN no configurado - no se puede disparar workflow")
        return False
    
    repo_owner = "SarelaFolgar"  # Cambia si es diferente
    repo_name = "control_super"
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/dispatches"
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    data = {
        "event_type": "process-data",
        "client_payload": {
            "message": "Nuevos datos agregados via API",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 204:
            print("✅ Workflow disparado exitosamente en GitHub")
            return True
        else:
            print(f"❌ Error al disparar workflow: {response.status_code}")
            print(f"Respuesta: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Excepción al disparar workflow: {str(e)}")
        return False

@app.get("/")
def read_root():
    return {"message": "API Control Super funcionando", "status": "ok"}

@app.post("/api/agregar-compra")
async def agregar_compra(compra: Compra):
    """Recibe una compra, la guarda en el CSV y dispara el workflow"""
    try:
        print(f"📦 Recibiendo compra con {len(compra.productos)} productos")
        
        # 1. VALIDAR Y PREPARAR DATOS
        nuevos_datos = []
        for producto in compra.productos:
            nuevos_datos.append({
                "fecha": convertir_fecha_formato(producto.fecha),
                "super": producto.super,
                "producto": producto.producto,
                "cantidad": producto.cantidad,
                "unidad": producto.unidad,
                "marca": producto.marca,
                "precio": producto.precio
            })
        
        df_nuevo = pd.DataFrame(nuevos_datos)
        print(f"✅ Datos convertidos a DataFrame: {len(df_nuevo)} registros")
        
        # 2. OBTENER GITHUB TOKEN
        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            print("❌ GITHUB_TOKEN no configurado en variables de entorno")
            return {
                "status": "error",
                "message": "Configuración incompleta del servidor"
            }
        
        # 3. CONECTAR CON GITHUB
        g = Github(github_token)
        repo = g.get_repo("SarelaFolgar/control_super")  # Cambia si es diferente
        
        # 4. LEER CSV ACTUAL
        try:
            csv_content = repo.get_contents("datos_super.csv")
            # Decodificar contenido base64
            contenido_decodificado = base64.b64decode(csv_content.content).decode('utf-8')
            
            # CORRECCIÓN: Usar StringIO de io en lugar de pandas.compat
            from io import StringIO
            df_actual = pd.read_csv(StringIO(contenido_decodificado))
            
            sha_actual = csv_content.sha
            print(f"📂 CSV actual cargado: {len(df_actual)} registros existentes")
        except Exception as e:
            print(f"⚠️  No se pudo cargar CSV existente, creando nuevo: {str(e)}")
            df_actual = pd.DataFrame(columns=['fecha', 'super', 'producto', 'cantidad', 'unidad', 'marca', 'precio'])
            sha_actual = None
        
        # 5. COMBINAR DATOS
        df_combinado = pd.concat([df_actual, df_nuevo], ignore_index=True)
        print(f"📊 Datos combinados: {len(df_combinado)} registros totales")
        
        # 6. GUARDAR NUEVO CSV
        new_csv_content = df_combinado.to_csv(index=False)
        
        if sha_actual:
            # Actualizar archivo existente
            commit = repo.update_file(
                path="datos_super.csv",
                message=f"📥 Agregar {len(df_nuevo)} productos via API",
                content=new_csv_content,
                sha=sha_actual
            )
        else:
            # Crear nuevo archivo
            commit = repo.create_file(
                path="datos_super.csv",
                message=f"📥 Crear CSV con {len(df_nuevo)} productos via API",
                content=new_csv_content
            )
        
        print(f"💾 CSV actualizado en GitHub: {len(df_combinado)} registros")
        
        # 7. DISPARAR WORKFLOW
        workflow_disparado = trigger_github_workflow()
        
        return {
            "status": "success",
            "message": f"✅ Compra guardada con {len(df_nuevo)} productos",
            "total_registros": len(df_combinado),
            "workflow_disparado": workflow_disparado,
            "nota": "Workflow se ejecutará para procesar datos y generar JSON"
        }
        
    except Exception as e:
        print(f"❌ Error procesando compra: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/status")
def get_status():
    """Verificar estado de la API"""
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0",
        "github_token_configured": bool(os.getenv("GITHUB_TOKEN"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
