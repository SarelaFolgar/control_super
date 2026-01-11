import pandas as pd
import numpy as np

def transformacion(df, dic_ciudad_super, dic_categoria_producto):
    print("=" * 80)
    print("INICIO TRANSFORMACION")
    print("=" * 80)
    print()
    print("CALCULAR PRECIO NETO")
    print("-"*60)
    df = calcular_precio_neto(df)
    print()
    print("CALCULAR MES Y AÑO")
    print("-"*60)
    df = calcular_mes_ano(df)
    print()
    print("CALCULAR NUEVA COLUMNA")
    print("-"*60)
    df= columna_por_diccionario(df, "super", "ciudad", dic_ciudad_super)
    print()
    print("CALCULAR NUEVA COLUMNA")
    print("-"*60)
    df= columna_por_diccionario(df, "producto", "categoria", dic_categoria_producto)
    #df = agregar_ultimo_precio_neto(df)
    print()
    print("CALCULAR ULTIMOS Y PRIMEROS PRECIOS NETOS")
    print("-"*60)
    df = calcular_ultimos_primeros_precios_netos(df)
    #df = calcular_variacion_precio(df)
    print()
    print("CALCULAR VARIACIONES DE PRECIO")
    print("-"*60)
    df = calcular_variaciones(df)
    #print()
    #print("ELIMINAR NULOS")
    #print("-"*60)
    #df = limpiar_nulos_para_json(df)
    print()
    print("=" * 80)
    print("FIN TRANSFORMACION")
    print("=" * 80)
    return df

def calcular_precio_neto(df):
    """
    Calcula eficientemente el precio neto (€/kg para gramos, €/ud para unidades).
    Versión vectorizada para máximo rendimiento.
    
    Args:
        df (pd.DataFrame): DataFrame con columnas 'precio', 'cantidad', 'unidad'
    
    Returns:
        pd.DataFrame: DataFrame con columna 'precio_neto' añadida
    """    
    # Crear copia para no modificar el original
    df_calc = df.copy()
    
    print("🧮 Calculando precio neto...")
    
    # 1. CONVERSIONES SEGURAS A NUMÉRICO
    df_calc['precio'] = pd.to_numeric(df_calc['precio'], errors='coerce')
    df_calc['cantidad'] = pd.to_numeric(df_calc['cantidad'], errors='coerce')
    
    # 2. NORMALIZAR UNIDADES (minúsculas, sin espacios)
    df_calc['unidad'] = df_calc['unidad'].astype(str).str.strip().str.lower()
    
    # 3. INICIALIZAR COLUMNA DE RESULTADO
    df_calc['precio_neto'] = np.nan
    
    # 4. MÁSCARAS PARA CÁLCULOS VECTORIZADOS
    
    # Gramos → €/kg (precio / (cantidad/1000))
    mask_g = df_calc['unidad'] == 'g'
    cantidad_g = df_calc.loc[mask_g, 'cantidad']
    # Evitar división por cero
    cantidad_g_safe = cantidad_g.replace(0, np.nan)
    df_calc.loc[mask_g, 'precio_neto'] = df_calc.loc[mask_g, 'precio'] / (cantidad_g_safe / 1000)
    
    # Unidades → €/ud (precio / cantidad)
    mask_ud = df_calc['unidad'] == 'ud'
    cantidad_ud = df_calc.loc[mask_ud, 'cantidad']
    cantidad_ud_safe = cantidad_ud.replace(0, np.nan)
    df_calc.loc[mask_ud, 'precio_neto'] = df_calc.loc[mask_ud, 'precio'] / cantidad_ud_safe
    
    # 5. ESTADÍSTICAS
    total = len(df_calc)
    calculados = df_calc['precio_neto'].notna().sum()
    g_count = mask_g.sum()
    ud_count = mask_ud.sum()
    
    print(f"✅ Precio neto calculado:")
    print(f"   • Total productos: {total}")
    print(f"   • Calculados: {calculados} ({calculados/total*100:.1f}%)")
    print(f"   • Gramos (€/kg): {g_count}")
    print(f"   • Unidades (€/ud): {ud_count}")
    
    # 6. REDONDEAR Y LIMPIAR
    df_calc['precio_neto'] = df_calc['precio_neto'].round(2)
    
    # Reemplazar infinitos por NaN
    df_calc['precio_neto'] = df_calc['precio_neto'].replace([np.inf, -np.inf], np.nan)
    
    if calculados == 0:
        print("   ❌ No se pudo calcular precio neto para ningún producto")
    
    return df_calc

def calcular_mes_ano(df):
    """
    Calcula el año y mes en español a partir de la fecha en formato DD/MM/AAAA.
    
    Args:
        df (pd.DataFrame): DataFrame con columna 'fecha' en formato DD/MM/AAAA
        
    Returns:
        pd.DataFrame: DataFrame con nuevas columnas 'mes' y 'ano'
    """    
    # Diccionario de meses en español
    meses_espanol = {
        1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
        5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
        9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
    }
    
    # Convertir la columna fecha a datetime
    df['fecha_dt'] = pd.to_datetime(df['fecha'], format='%d/%m/%Y', errors='coerce')
    
    # Extraer año y mes numérico
    df['ano'] = df['fecha_dt'].dt.year
    df['mes_num'] = df['fecha_dt'].dt.month
    
    # Convertir mes numérico a español
    df['mes'] = df['mes_num'].map(meses_espanol)
    
    # Eliminar columnas temporales
    df = df.drop(['fecha_dt', 'mes_num'], axis=1)
    
    # Reordenar columnas si es necesario
    columnas = list(df.columns)
    if 'fecha' in columnas and 'mes' in columnas and 'ano' in columnas:
        # Poner mes y año después de fecha
        columnas.remove('mes')
        columnas.remove('ano')
        fecha_index = columnas.index('fecha')
        columnas.insert(fecha_index + 1, 'mes')
        columnas.insert(fecha_index + 2, 'ano')
        df = df[columnas]
    
    print(f"✅ Columnas 'mes' y 'ano' añadidas al DataFrame")
    print(f"   Años únicos: {sorted(df['ano'].unique())}")
    
    return df

def columna_por_diccionario(df, col_original, col_nueva, diccionario):
    """
    Crea una nueva columna mapeando valores de una columna existente usando un diccionario.
    
    Args:
        df: DataFrame al que añadir la columna
        col_original: Nombre de la columna original con los valores a mapear
        col_nueva: Nombre de la nueva columna a crear
        diccionario: Diccionario con mapeo {valor_original: valor_nuevo}
    
    Returns:
        DataFrame con la nueva columna añadida
    """    
    print(f"📊 Creando columna '{col_nueva}' a partir de '{col_original}'...")
    
    # Verificar que la columna original existe
    if col_original not in df.columns:
        print(f"❌ Error: Columna '{col_original}' no existe")
        return df
    
    # Comprobar valores faltantes en el diccionario
    valores_unicos = df[col_original].dropna().unique()
    faltantes = [v for v in valores_unicos if v not in diccionario]
    
    if faltantes:
        print(f"⚠️  {len(faltantes)} valores no están en el diccionario")
        for i, valor in enumerate(faltantes[:10]):
            print(f"   {i+1}. '{valor}'")
    else:
        print("   Todos los valores tienen correspondencia en el diccionario")
    
    # Aplicar el mapeo
    df[col_nueva] = df[col_original].map(diccionario)
    
    # Mostrar resultado
    mapeados = df[col_nueva].notna().sum()
    print(f"✅ {mapeados}/{len(df)} valores mapeados")
    
    return df

def calcular_ultimos_primeros_precios_netos(df):
    """
    Calcula varios tipos de precios netos:
    1. ultimo_precio_neto: Último precio para cada producto/marca/super (todos los años)
    2. ultimo_precio_neto_YYYY: Último precio por año para cada producto/marca/super
    3. primer_precio_neto: Primer precio para cada producto/marca/super (todos los años)
    4. primer_precio_neto_YYYY: Primer precio por año para cada producto/marca/super
    
    Args:
        df: DataFrame con columnas 'fecha', 'producto', 'marca', 'super', 'precio_neto'
    
    Returns:
        DataFrame con nuevas columnas de precios
    """    
    print("📊 Calculando precios netos históricos...")
    
    # Verificar columnas necesarias
    columnas_necesarias = ['fecha', 'producto', 'marca', 'super', 'precio_neto']
    for col in columnas_necesarias:
        if col not in df.columns:
            print(f"❌ Error: Falta columna '{col}'")
            return df
    
    # Convertir fecha y extraer año
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df['fecha']):
        df['fecha'] = pd.to_datetime(df['fecha'], dayfirst=True, errors='coerce')
    
    if 'ano' not in df.columns:
        df['ano'] = df['fecha'].dt.year
    
    # 1. ÚLTIMO PRECIO GENERAL (todos los años)
    print("1. Último precio general (todos los años)...")
    df_sorted_desc = df.sort_values('fecha', ascending=False)
    ultimos_generales = df_sorted_desc.drop_duplicates(
        subset=['producto', 'marca', 'super']
    )[['producto', 'marca', 'super', 'precio_neto']]
    ultimos_generales = ultimos_generales.rename(
        columns={'precio_neto': 'ultimo_precio_neto'}
    )
    
    # 2. PRIMER PRECIO GENERAL
    print("2. Primer precio general (todos los años)...")
    df_sorted_asc = df.sort_values('fecha', ascending=True)
    primeros_generales = df_sorted_asc.drop_duplicates(
        subset=['producto', 'marca', 'super']
    )[['producto', 'marca', 'super', 'precio_neto']]
    primeros_generales = primeros_generales.rename(
        columns={'precio_neto': 'primer_precio_neto'}
    )
    
    # Combinar precios generales
    df = df.merge(ultimos_generales, on=['producto', 'marca', 'super'], how='left')
    df = df.merge(primeros_generales, on=['producto', 'marca', 'super'], how='left')
    
    # 3. PRECIOS POR AÑO (por producto/marca/super dentro de cada año)
    años_unicos = sorted(df['ano'].dropna().unique())
    print(f"3. Procesando precios por año ({len(años_unicos)} años encontrados)...")
    
    for año in años_unicos:
        print(f"   Año {año}...")
        df_año = df[df['ano'] == año].copy()
        
        if len(df_año) == 0:
            continue
        
        # Último precio del año (por producto/marca/super)
        df_año_desc = df_año.sort_values('fecha', ascending=False)
        ultimos_año = df_año_desc.drop_duplicates(
            subset=['producto', 'marca', 'super']
        )[['producto', 'marca', 'super', 'precio_neto']]
        ultimos_año = ultimos_año.rename(
            columns={'precio_neto': f'ultimo_precio_neto_{int(año)}'}
        )
        
        # Primer precio del año (por producto/marca/super)
        df_año_asc = df_año.sort_values('fecha', ascending=True)
        primeros_año = df_año_asc.drop_duplicates(
            subset=['producto', 'marca', 'super']
        )[['producto', 'marca', 'super', 'precio_neto']]
        primeros_año = primeros_año.rename(
            columns={'precio_neto': f'primer_precio_neto_{int(año)}'}
        )
        
        # Combinar
        df = df.merge(ultimos_año, on=['producto', 'marca', 'super'], how='left')
        df = df.merge(primeros_año, on=['producto', 'marca', 'super'], how='left')
    
    print("\n✅ Precios calculados:")
    print(f"   - Último precio general: para {len(ultimos_generales)} combinaciones producto/marca/super")
    print(f"   - Primer precio general: para {len(primeros_generales)} combinaciones producto/marca/super")
    print(f"   - Precios por año: para {len(años_unicos)} años diferentes")
    
    # Mostrar columnas añadidas
    nuevas_columnas = [col for col in df.columns if 'precio_neto_' in col or col in ['ultimo_precio_neto', 'primer_precio_neto']]
    print(f"   - Columnas añadidas: {len(nuevas_columnas)}")
    
    return df

def calcular_variaciones(df):
    """
    Calcula múltiples variaciones de precio:
    1. variacion_actual: entre precio_neto y ultimo_precio_neto
    2. variacion_total: entre primer_precio_neto y ultimo_precio_neto  
    3. variacion_YYYY: para cada año entre primer_precio_neto_YYYY y ultimo_precio_neto_YYYY
    """    
    print("📊 Calculando variaciones de precio...")
    
    # Verificar columnas básicas
    if 'precio_neto' not in df.columns:
        print("❌ Error: Falta columna 'precio_neto'")
        return df
    
    # 1. VARIACIÓN ACTUAL (precio actual vs último precio)
    if 'ultimo_precio_neto' in df.columns:
        print("1. Calculando variación actual...")
        # Calcular variación porcentual: ((último - actual) / actual) * 100
        df['variacion_actual'] = ((df['ultimo_precio_neto'] - df['precio_neto']) / df['precio_neto']) * 100
        df['variacion_actual'] = df['variacion_actual'].round(2)
        
        variaciones_actuales = df['variacion_actual'].notna().sum()
        print(f"   ✅ Calculada para {variaciones_actuales}/{len(df)} registros")
    else:
        print("⚠️  Advertencia: No se calculó variación actual (falta 'ultimo_precio_neto')")
    
    # 2. VARIACIÓN TOTAL (primero vs último)
    if 'primer_precio_neto' in df.columns and 'ultimo_precio_neto' in df.columns:
        print("2. Calculando variación total...")
        # Calcular variación porcentual: ((último - primero) / primero) * 100
        df['variacion_total'] = ((df['ultimo_precio_neto'] - df['primer_precio_neto']) / df['primer_precio_neto']) * 100
        df['variacion_total'] = df['variacion_total'].round(2)
        
        variaciones_totales = df['variacion_total'].notna().sum()
        print(f"   ✅ Calculada para {variaciones_totales}/{len(df)} registros")
    else:
        print("⚠️  Advertencia: No se calculó variación total (faltan columnas)")
    
    # 3. VARIACIONES POR AÑO
    print("3. Calculando variaciones por año...")
    
    # Buscar todas las columnas de primer y último precio por año
    columnas_primer = [col for col in df.columns if col.startswith('primer_precio_neto_')]
    columnas_ultimo = [col for col in df.columns if col.startswith('ultimo_precio_neto_')]
    
    # Extraer años de las columnas
    años_primer = [col.replace('primer_precio_neto_', '') for col in columnas_primer]
    años_ultimo = [col.replace('ultimo_precio_neto_', '') for col in columnas_ultimo]
    
    # Años comunes (que tienen ambas columnas)
    años_comunes = sorted(set(años_primer) & set(años_ultimo))
    
    print(f"   Años con datos completos: {len(años_comunes)}")
    
    for año in años_comunes:
        col_primer = f'primer_precio_neto_{año}'
        col_ultimo = f'ultimo_precio_neto_{año}'
        
        # Calcular variación para este año
        df[f'variacion_{año}'] = ((df[col_ultimo] - df[col_primer]) / df[col_primer]) * 100
        df[f'variacion_{año}'] = df[f'variacion_{año}'].round(2)
        
        # Contar cuántos registros tienen esta variación calculada
        variaciones_año = df[f'variacion_{año}'].notna().sum()
        print(f"   Año {año}: {variaciones_año} registros")
    
    # Estadísticas finales
    print(f"\n✅ Todas las variaciones calculadas")
    
    # Contar columnas de variación añadidas
    columnas_variacion = [col for col in df.columns if col.startswith('variacion')]
    print(f"📊 Columnas de variación añadidas: {len(columnas_variacion)}")
    
    return df

def main():
    """Función principal que ejecuta todo el proceso"""    
    # 1. CARGAR CSV
    print("📂 Cargando datos_super.csv...")
    df = pd.read_csv("datos_super.csv")
    print(f"✅ CSV cargado: {len(df)} registros")
    
    # 2. TUS DICCIONARIOS (los que usas en Python)
    dic_ciudad_super = {
      "alcampo":"tenerife",
      "charco":"valle gran rey",
      "flor del valle":"valle gran rey",
      "fruteria":"valle gran rey",
      "heladeria":"valle gran rey",
      "hiperdino":"tenerife",
      "lupe":"valle gran rey",
      "olivier":"valle gran rey",
      "spar borbalan":"valle gran rey",
      "spar playa":"valle gran rey",
  }
    
    dic_categoria_producto = {
      # FRUTAS
      "aguacates": "fruta",
      "fresas": "fruta",
      "kiwi": "fruta",
      "manzanas": "fruta",
      "platano": "fruta",
      "platanos": "fruta",
  
      # CONDIMENTOS
      "ajo en polvo": "condimentos",
      "ajo-perejil": "condimentos",
      "perejil": "condimentos",
      "comino": "condimentos",
      "pimienta negra": "condimentos",
      
      # VERDURAS/HORTALIZAS
      "ajos": "verduras",
      "cebolla": "verduras",
      "espinacas congeladas": "verduras",
      "lechuga": "verduras",
      "pimiento amarillo": "verduras",
      "pimiento rojo": "verduras",
      "pimiento verde": "verduras",
      "pimientos": "verduras",
      "tomate cherry": "verduras",
      "tomate frito": "verduras",
      "tomate natural": "verduras",
      "zanahorias": "verduras",
      "maiz": "verduras",
      "patatas": "verduras",
      "patatas congeladas": "verduras",
      
      # CARNES/POLLO
      "bacon": "carne",
      "bistec de res": "carne",
      "carne picada de anojo": "carne",
      "carne picada de res": "carne",
      "chorizo": "carne",
      "chorizo perro": "carne",
      "croquetas": "carne",
      "fuet": "carne",
      "fuetec": "carne",
      "hamburguesa de res": "carne",
      "jamon serrano": "carne",
      "lomo adobado": "carne",
      "pechuga de pollo": "carne",
      "pollo adobado": "carne",
      "pollo mechado": "carne",
      "salchichitas": "carne",
      
      # PESCADO
      "atun": "pescado",
      "tarro atun": "pescado",
      
      # LÁCTEOS
      "huevos": "lacteos",
      "mantequilla": "lacteos",
      "nata": "lacteos",
      "queso fresco": "queso",
      "queso gouda": "queso",
      "queso semicurado": "queso",
      "yogur fresa": "yogur",
      "yogur fresa asqueroso": "yogur",
      "yogur frutos del bosque": "yogur",
      "yogur griego": "yogur",
      "yogur proteinas": "yogur",
      "leche": "leche",
      "leche condensada sin lactosa": "leche",
      "leche sin lactosa": "leche",
      "natillas chocolate": "yogur",
      "natillas vainilla": "yogur",
      
      # PANADERÍA/CEREALES
      "arroz": "arroz",
      "avena": "cereales",
      "cereales": "cereales",
      "cereales rellenos de leche sin gluten": "cereales",
      "cereales rellenos de leche": "cereales",
      "cereales sin gluten": "cereales",
      "corn flakes sin gluten": "cereales",
      "gofio": "harina",
      "harina": "harina",
      "muesli chocolate": "cereales",
      "pan": "pan",
      "pan de molde": "pan",
      "pan de molde sin gluten": "pan",
      "pasta sin gluten": "pasta",
      "espaguetti": "pasta",
      "pizza sin gluten": "pizza",
  
      # GALLETAS
      "chocogalletas": "galletas",
      "galletas": "galletas",
      "galletas flor sin gluten": "galletas",
      "galletas maria sin gluten": "galletas",
  
      # FRUTOS SECOS
      "anacardos": "frutos secos",
      
      # SNACKS/DULCES
      "pan de cadiz": "snacks",
      "papadelta": "snacks",
      "maiz palomitas": "snacks",
      "flan": "snacks",
      "chocobons": "chocolate",
      "chocolate": "chocolate",
      "tortitas de arroz y quinoa": "snacks",
      "crema de cacahuete": "snacks",
      "mermelada de arandanos": "mermelada",
      "mermelada de fresa": "mermelada",
      "mermelada de platano": "mermelada",
      "miel": "snacks",
      "munchitos": "patatillas",
      "palomitas gusanito": "patatillas",
      "patatillas": "patatillas",
      "patatillas paja": "patatillas",
      "potitos": "snacks",
      "chocolate negro": "chocolate",
      "tortitas de arroz": "snacks",
      "tortitas de arroz con chocolate": "snacks",
      "pajitas": "patatillas",
      "aceitunas": "snacks",
      
      # BEBIDAS
      "agua": "bebidas",
      "vino blanco": "bebidas",
      "cafe": "bebidas",
      
      # ACEITES/CONDIMENTOS
      "aceite de oliva virgen extra": "aceites",
      "aceite de girasol":"aceites",
      "ketchup": "aceites",
      "mayonesa": "aceites",
      
      # LEGUMBRES/CONSERVAS
      "garbanzos": "legumbres",
      
      # LIMPIEZA/HOGAR
      "bayetas": "hogar",
      "pegamento": "hogar",
      "acondicionador": "hogar",
      "bolsas basura": "hogar",
      "bolsas zip": "hogar",
      "detergente lavadora": "hogar",
      "estropajo nanas": "hogar",
      "estropajos": "hogar",
      "insecticida": "hogar",
      "lavavajillas": "hogar",
      "limpiador multiusos": "hogar",
      "papel de cocina": "hogar",
      "papel de horno": "hogar",
      "papel higienico": "hogar",
      "quitagrasa": "hogar",
      "suavizante lavadora": "hogar",
      "tierra": "hogar",
      
      # HIGIENE/CUIDADO PERSONAL
      "champu": "higiene",
      "crema solar": "higiene",
      "desodorante": "higiene",
      "gel de ducha": "higiene",
      "pasta de dientes": "higiene",
      
      # SALUD/FARMACIA
      "bicarbonato de sodio": "salud",
      "compresas": "salud",
      "condones": "salud",
      "tampones": "salud",    
      
      # VARIOS/OTROS
      "planta": "plantas",
  }
    
    # 3. EJECUTAR TRANSFORMACIÓN
    df_transformado = transformacion(df, dic_ciudad_super, dic_categoria_producto)
    
    # 4. GUARDAR COMO JSON
    print("\n💾 Guardando como datos_super.json...")
    df_transformado.to_json("datos_super.json", orient="records", indent=2, force_ascii=False)
    print(f"✅ JSON guardado: {len(df_transformado)} registros")

# 5. EJECUTAR AUTOMÁTICAMENTE SI SE LLAMA DIRECTAMENTE
if __name__ == "__main__":
    main()
