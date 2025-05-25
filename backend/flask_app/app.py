from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_mysqldb import MySQL
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
import json
import subprocess
import jwt
import datetime
from proxmoxer import ProxmoxAPI
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
import os
import requests
import paramiko
from urllib.parse import urlencode
from urllib3.exceptions import InsecureRequestWarning
import shutil
from requests.exceptions import ConnectionError, HTTPError
import traceback
# Suppress only the single warning from urllib3 needed.
requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

app = Flask(__name__)
app.secret_key = 'alumne'

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'ansidesk@gmail.com'  # Tu correo
app.config['MAIL_PASSWORD'] = 'osqgopebivmzpkhu'  # Usa contraseña de app
app.config['MAIL_DEFAULT_SENDER'] = ('Ansidesk', 'ansidesk@gmail.com')
    
mail = Mail(app)


CORS(app)
# Configuración del generador de tokens
serializer = URLSafeTimedSerializer(app.secret_key)
# Configuración de la base de datos
app.config["MYSQL_HOST"] = "10.144.64.101"
app.config["MYSQL_PORT"] = 3307 
app.config["MYSQL_USER"] = "alumne"
app.config["MYSQL_PASSWORD"] = "alumne"
app.config["MYSQL_DB"] = "ansidesk"


mysql = MySQL(app)

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", (name, email, password))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"message": "Registro exitoso"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    # Verificación de los datos del usuario
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE email=%s AND password=%s", (email, password))
    user = cursor.fetchone()
    cursor.close()

    if user:
        # Establecer el ID de usuario en la sesión
        session['user_id'] = user[0]
        return jsonify({
            "message": "Inicio de sesión exitoso",
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2]
            }
        }), 200
    else:
        return jsonify({"error": "Credenciales incorrectas"}), 401



@app.route("/api/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()

        if user:
            
            return jsonify({
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "created_at": user[3]
            }), 200
        else:
            return jsonify({"error": "Usuario no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    data = request.json
    name = data.get("name")
    email = data.get("email")

    if not name or not email:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("UPDATE users SET name = %s, email = %s WHERE id = %s", (name, email, user_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"message": "Usuario actualizado correctamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/users/<int:user_id>/password", methods=["PUT"])
def update_password(user_id):
    data = request.json
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        cursor = mysql.connection.cursor()

        # Verificar si la contraseña actual es correcta
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user or user[0] != current_password:
            return jsonify({"error": "La contraseña actual es incorrecta"}), 401

        # Actualizar la contraseña
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (new_password, user_id))
        mysql.connection.commit()
        cursor.close()

        return jsonify({"message": "Contraseña actualizada correctamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/machines/user/<int:user_id>", methods=["GET"])
def get_user_machines(user_id):
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT * FROM machines WHERE user_id = %s", (user_id,))
        machines = cursor.fetchall()
        cursor.close()

        # Depuración: Verificar si hay resultados
        if not machines:
            print(f"No machines found for user_id: {user_id}")

        # Convertir los datos a un formato JSON
        machines_list = []
        for machine in machines:
            machines_list.append({
                "id": machine[0],
                "name": machine[1],
                "description": machine[2],  # Aquí estamos incluyendo el status
                "cpu": machine[3],
                "ram": machine[4],
                "storage": machine[5],
                "os": machine[6],
                "os_version": machine[7],
                "created_at": machine[8],
                "status": machine[12],
            })

        return jsonify(machines_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ——— Configuración ———
PROXMOX_HOST = "10.144.146.82"
API_TOKEN_ID = "admin@pam!admin"
API_TOKEN_SECRET = "da459c77-43c4-4f08-a8f6-17166e057a00"
NODE_NAME = "proxmox"
VERIFY_SSL = False
USERNAME = "root@pam"
PASSWORD = "alumne"



# Endpoint base
BASE_URL = f'https://{PROXMOX_HOST}:8006/api2/json'

# Headers con API token
HEADERS = {
    "Authorization": f"PVEAPIToken={API_TOKEN_ID}={API_TOKEN_SECRET}",
    "Content-Type": "application/x-www-form-urlencoded"
}




@app.route("/api/machines/<int:user_id>", methods=["GET"])
def get_proxmox_vm_id(user_id):
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id,status FROM machines WHERE user_id = %s", (user_id,))
    machine = cursor.fetchone()
    cursor.close()

    if not machine:
        return jsonify({"error": "Máquina no encontrada o no pertenece a este usuario"}), 404

    return jsonify({"proxmox_vm_id": machine[0]})

# Funciones para interactuar con la API de Proxmox
def get_vm_status(vm_id):
    url = f'{BASE_URL}/nodes/{NODE_NAME}/qemu/{vm_id}/status/current'
    res = requests.get(url, headers=HEADERS, verify=VERIFY_SSL)
    res.raise_for_status()
    return res.json()['data']['status']

def proxmox_vm_action(vm_id, action):
    if action == "delete":
        url = f"{BASE_URL}/nodes/{NODE_NAME}/qemu/{vm_id}"
        res = requests.delete(url, headers=HEADERS, verify=VERIFY_SSL)
    else:
        url = f"{BASE_URL}/nodes/{NODE_NAME}/qemu/{vm_id}/status/{action}"
        res = requests.post(url, headers=HEADERS, verify=VERIFY_SSL)
    
    res.raise_for_status()
    return res.json()

@app.route("/api/machines/<int:vm_id>/user/<int:user_id>/toggle", methods=["PATCH"])
def toggle_vm(vm_id, user_id):
    cursor = mysql.connection.cursor()
    # Verifica que la VM pertenece al usuario
    cursor.execute("SELECT id, status FROM machines WHERE id = %s AND user_id = %s", (vm_id, user_id))
    machine = cursor.fetchone()

    if not machine:
        cursor.close()
        return jsonify({"error": "Máquina no encontrada o no pertenece al usuario"}), 404

    try:
        # Obtener estado real desde Proxmox
        status = get_vm_status(vm_id)

        # Determinar acción a ejecutar
        action = "stop" if status == "running" else "start"
        new_status = "stopped" if action == "stop" else "running"

        # Ejecutar en Proxmox
        proxmox_vm_action(vm_id, action)

        # Guardar en base de datos
        cursor.execute("UPDATE machines SET status = %s WHERE id = %s", (new_status, vm_id))
        mysql.connection.commit()
        cursor.close()

        return jsonify({
            "message": f"VM {action} ejecutado correctamente",
            "new_status": new_status
        })

    except Exception as e:
        cursor.close()
        return jsonify({"error": str(e)}), 500



 
@app.route("/api/create-machine", methods=["POST"])
def create_machine():
    try:
        data = request.json

        # Extraer todos los campos del frontend
        user_id = data["user_id"]
        name = data["name"]
        description = data["description"]
        cpu = int(data["cpu"])
        ram = int(data["ram"])
        storage = int(data["storage"])
        os_type = data["os"]
        os_version = data["osVersion"]

        # Mapeo de os a rutas de archivos .qcow2
        qcow2_paths = {
            "ubuntu-desktop": "/var/lib/vz/images/ubuntucliente.raw",
            "ubuntu-server": "/var/lib/vz/images/ubuntuserver.raw",
            "Windows 10": "/var/lib/vz/images/win10.qcow2",
            "windows": "/var/lib/vz/images/winserver.qcow2"
        }

        if os_type not in qcow2_paths:
            return jsonify({"error": "Sistema operativo no soportado"}), 400
        qcow2_path = qcow2_paths[os_type]

        # Obtener nuevo VMID desde Proxmox API
        proxmox_host = "10.144.146.82"
        token_id = "admin@pam!admin"
        token_value = "da459c77-43c4-4f08-a8f6-17166e057a00"
        node = "proxmox"

        headers = {
            "Authorization": f"PVEAPIToken={token_id}={token_value}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        base_url = f"https://{proxmox_host}:8006/api2/json"

        try:
            vms_resp = requests.get(f"{base_url}/nodes/{node}/qemu", headers=headers, verify=False)
            vms_resp.raise_for_status()
        except ConnectionError as e:
            return jsonify({"error": f"No se pudo conectar al servidor Proxmox: {str(e)}"}), 500
        except HTTPError as e:
            return jsonify({"error": f"Error en la solicitud a Proxmox: {str(e)}"}), 500

        existing_ids = [vm["vmid"] for vm in vms_resp.json()["data"]]
        new_vmid = max(existing_ids) + 1 if existing_ids else 100

        # Buscar ejecutable Node.js en host
        node_path = shutil.which("node") or shutil.which("nodejs") or "/usr/bin/node"
        if not os.path.exists(node_path):
            return jsonify({"error": f"Node.js no está instalado o no se encuentra en {node_path}"}), 500

        # Definir ruta absoluta al script (ajusta si usas docker volúmenes)
        script_path = os.path.join(os.getcwd(), "script", "createM.js")

        if not os.path.exists(script_path):
            return jsonify({"error": f"El script no se encuentra en {script_path}"}), 500

        # Ejecutar el script Node.js con los parámetros
        process = subprocess.run(
            [node_path, script_path, str(new_vmid), name, str(cpu), str(ram), str(storage), qcow2_path],
            capture_output=True,
            text=True,
            timeout=60
        )

        if process.returncode != 0:
            return jsonify({"error": f"Error al ejecutar createM.js: {process.stderr}"}), 500

        # Guardar en BD solo si todo salió bien
        cur = mysql.connection.cursor()
        cur.execute(
            """
            INSERT INTO machines (user_id, id, name, description, cpu, ram, storage, os, os_version)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (user_id, new_vmid, name, description, cpu, ram, storage, os_type, os_version)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "VM creada correctamente", "id": new_vmid}), 200

    except KeyError as e:
        return jsonify({"error": f"Falta el campo requerido: {str(e)}"}), 400
    except Exception as e:
        print("❌ ERROR INTERNO:")
        traceback.print_exc()
        return jsonify({"error": "Error interno del servidor: " + str(e)}), 500


@app.route("/api/machines/<int:vm_id>/user/<int:user_id>", methods=["DELETE"])
def delete_machine(vm_id, user_id):
    try:
        cursor = mysql.connection.cursor()
        # Verificamos que la máquina pertenece al usuario
        cursor.execute("SELECT id FROM machines WHERE id = %s AND user_id = %s", (vm_id, user_id))
        machine = cursor.fetchone()

        if not machine:
            cursor.close()
            return jsonify({"error": "Máquina no encontrada o no pertenece al usuario"}), 404

        # (Opcional) Eliminar en Proxmox
        proxmox_vm_action(vm_id, "delete")

        # Eliminar en la base de datos
        cursor.execute("DELETE FROM machines WHERE id = %s", (vm_id,))
        mysql.connection.commit()
        cursor.close()

        return jsonify({"message": f"Máquina {vm_id} eliminada correctamente"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route("/api/machines/<int:user_id>/novnc-url/<int:idvm>", methods=["GET"])
def get_novnc_url_by_name(user_id, idvm):
    try:
        # Buscar la máquina que pertenezca al user_id y tenga ese idvm
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT id, name FROM machines WHERE user_id = %s AND id = %s", (user_id, idvm))
        machine = cursor.fetchone()
        cursor.close()

        if not machine:
            return jsonify({"error": "Máquina no encontrada o no pertenece a este usuario"}), 404

        proxmox_vm_id = machine[0]
        name = machine[1]

        # Generar ticket NoVNC
        url = f"{BASE_URL}/nodes/{NODE_NAME}/qemu/{proxmox_vm_id}/vncproxy"
        response = requests.post(url, headers=HEADERS, verify=VERIFY_SSL)
        response.raise_for_status()  # Lanza un error si la respuesta es incorrecta
        data = response.json()["data"]

        ticket = data["ticket"]
        port = data["port"]

        # Generar la URL de NoVNC
        novnc_url = f"https://10.144.146.82:8006/?console=kvm&novnc=1&vmid={proxmox_vm_id}&vmname={name}&node={NODE_NAME}"
        
        return jsonify({"novnc_url": novnc_url}), 200

    except requests.exceptions.RequestException as e:
        # Error al hacer la solicitud a la API de Proxmox
        return jsonify({"error": "Error al conectar con Proxmox: " + str(e)}), 500

    except Exception as e:
        # Manejo de otros posibles errores
        return jsonify({"error": "Error interno: " + str(e)}), 500


        
@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")

    if not email:
        return jsonify({"error": "El correo electrónico es obligatorio"}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({"error": "El correo electrónico no está registrado"}), 404

    token = serializer.dumps(email, salt="password-reset-salt")
    reset_url = f"https://ansidesk.cat/reset-password?token={token}"

    # Enviar correo
    try:
        msg = Message(
    subject="Restablece tu contraseña - AnsiDesk",
    sender="ansidesk@gmail.com",
    recipients=[email],
    html=f"""
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://ansidesk.cat/logoANSIDESK.png" alt="AnsiDesk Logo" style="height: 60px;" />
      </div>
      <h2 style="color: #333;">Solicitud de restablecimiento de contraseña</h2>
      <p style="color: #555;">
        Hola,<br><br>
        Hemos recibido una solicitud para restablecer tu contraseña en <strong>AnsiDesk</strong>.<br>
        Si no fuiste tú, puedes ignorar este mensaje.
      </p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color: #555;">
        Este enlace expirará en 1 hora por motivos de seguridad.<br><br>
        Si tienes problemas, copia y pega esta URL en tu navegador:<br>
        <a href="{reset_url}">{reset_url}</a>
      </p>
      <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">
        Un saludo,<br>
        El equipo de <strong>AnsiDesk</strong><br>
        <a href="https://ansidesk.cat" style="color: #999;">https://ansidesk.cat</a>
      </p>
    </div>
    """
)

        mail.send(msg)
        return jsonify({"message": "Se ha enviado un correo con el enlace de restablecimiento"}), 200
    except Exception as e:
        return jsonify({"error": f"No se pudo enviar el correo: {str(e)}"}), 500


@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        # Validar el token (caduca en 1 hora)
        email = serializer.loads(token, salt="password-reset-salt", max_age=3600)

        # Actualizar la contraseña en la base de datos
        cursor = mysql.connection.cursor()
        cursor.execute("UPDATE users SET password = %s WHERE email = %s", (new_password, email))
        mysql.connection.commit()
        cursor.close()

        return jsonify({"message": "Contraseña actualizada correctamente"}), 200

    except SignatureExpired:
        return jsonify({"error": "El enlace ha caducado"}), 400
    except BadSignature:
        return jsonify({"error": "El enlace no es válido"}), 400
    except Exception as e:
        return jsonify({"error": "Error interno"}), 500

@app.route("/api/contact", methods=["POST"])
def enviar_correo():
    data = request.json
    nombre = data.get("name")
    email = data.get("email")
    mensaje = data.get("message")

    if not all([nombre, email, mensaje]):
        return jsonify({"error": "Faltan campos"}), 400

    try:
        msg = Message(
            subject=f"Nuevo mensaje de contacto de {nombre}",
            recipients=['ansidesk@gmail.com'],
            body=f"""
Has recibido un nuevo mensaje desde el formulario de contacto:

Nombre: {nombre}
Correo: {email}
Mensaje:
{mensaje}
            """
        )
        mail.send(msg)
        return jsonify({"message": "Correo enviado con éxito"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run( host="0.0.0.0", port=5000)
