from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import json
from datetime import datetime
import os

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

@app.get("/")
def read_root():
    return {"message": "API Control Super funcionando", "status": "ok"}

@app.post("/api/agregar-compra")
async def agregar_compra(compra: Compra):
    """Recibe una compra y la guarda en el CSV"""
    try:
        print(f"📦 Recibiendo compra con {len(compra.productos)} productos")
        
        # Convertir a DataFrame
        nuevos_datos = []
        for producto in compra.productos:
            nuevos_datos.append({
                "fecha": producto.fecha,
                "super": producto.super,
                "producto": producto.producto,
                "cantidad": producto.cantidad,
                "unidad": producto.unidad,
                "marca": producto.marca,
                "precio": producto.precio
            })
        
        df_nuevo = pd.DataFrame(nuevos_datos)
        print(f"✅ Datos convertidos a DataFrame: {len(df_nuevo)} registros")
        
        # Guardar temporalmente (en producción, aquí se guardaría en el CSV)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_temp = f"compra_{timestamp}.csv"
        df_nuevo.to_csv(archivo_temp, index=False)
        
        print(f"💾 Compra guardada temporalmente como {archivo_temp}")
        
        # Aquí más tarde conectaremos con GitHub para actualizar el CSV real
        # Por ahora solo confirmamos recepción
        
        return {
            "status": "success",
            "message": f"Compra recibida con {len(df_nuevo)} productos",
            "productos": len(df_nuevo),
            "archivo": archivo_temp,
            "nota": "Los datos se procesarán automáticamente en breve"
        }
        
    except Exception as e:
        print(f"❌ Error procesando compra: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/status")
def get_status():
    """Verificar estado de la API"""
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
