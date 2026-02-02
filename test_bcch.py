"""
Script de prueba para verificar la conexión a la API del Banco Central de Chile
"""
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

import bcchapi

def test_connection():
    user = os.environ.get("BCCH_USER")
    password = os.environ.get("BCCH_PASSWORD")
    
    print(f"Usuario: {user}")
    print(f"Password: {'*' * len(password) if password else 'NO ENCONTRADA'}")
    
    if not user or not password:
        print("ERROR: No se encontraron las credenciales BCCH_USER o BCCH_PASSWORD")
        return
    
    try:
        print("\nConectando a la API del Banco Central...")
        siete = bcchapi.Siete(user, password)
        
        # Serie del PIB Real
        series_id = "F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T"
        print(f"\nObteniendo serie: {series_id}")
        
        df = siete.cuadro(
            series=[series_id],
            nombres=["pib_real"],
            desde="2020-01-01"
        )
        
        print("\n✅ Conexión exitosa!")
        print("\nÚltimos 5 registros:")
        print(df.tail())
        
        return df
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

if __name__ == "__main__":
    test_connection()
