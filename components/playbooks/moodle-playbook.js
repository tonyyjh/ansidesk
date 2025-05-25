// Script de instalación de Moodle con Apache
export const moodlePlaybook = `#!/bin/bash

# Script to fully automate Moodle installation using Ansible
# Run this script as root or with sudo

# Exit on any error
set -e

# Define directories and files
WORKDIR="/root/moodle-ansible"
ANSIBLE_DIR="$WORKDIR/ansible"
PLAYBOOK_FILE="$ANSIBLE_DIR/moodle_playbook.yml"
INVENTORY_FILE="$ANSIBLE_DIR/hosts"
VARS_FILE="$ANSIBLE_DIR/vars.yml"
VHOST_FILE="$ANSIBLE_DIR/templates/moodle-vhost.conf.j2"

# Install required packages for downloading and parsing
echo "Installing required packages..."
apt update
apt install -y ansible python3-pymysql unzip curl

# Fetch the latest Moodle 4.5.x download URL and checksum
echo "Fetching latest Moodle 4.5.x download information..."
MOODLE_PAGE=$(curl -s https://download.moodle.org/releases/stable/405/ || echo "")
if [ -n "$MOODLE_PAGE" ]; then
    # Try to extract the latest 4.5.x tgz URL
    MOODLE_URL=$(echo "$MOODLE_PAGE" | grep -oP 'https://download.moodle.org/download.php/direct/stable405/moodle-4\\.5\\.\\d+\\.tgz' | head -1)
fi

# Fallback to a known working URL and checksum if scraping fails
if [ -z "$MOODLE_URL" ]; then
    echo "Warning: Could not find Moodle 4.5.x download URL, using fallback..."
    MOODLE_URL="https://download.moodle.org/download.php/direct/stable405/moodle-4.5.3.tgz"
    MOODLE_CHECKSUM="c45a9133f8383823c7ec491f0d4dcb603651493a9b75cea303e9d8b121f62bed"
else
    MOODLE_CHECKSUM_PAGE=$(curl -s "\${MOODLE_URL%%.tgz}.sha256" || echo "")
    MOODLE_CHECKSUM=$(echo "$MOODLE_CHECKSUM_PAGE" | awk '{print $1}')
    if [ -z "$MOODLE_CHECKSUM" ]; then
        echo "Warning: Could not find checksum, using fallback checksum..."
        MOODLE_CHECKSUM="c45a9133f8383823c7ec491f0d4dcb603651493a9b75cea303e9d8b121f62bed"
    fi
fi

MOODLE_FILE=$(basename "$MOODLE_URL")
echo "Using Moodle URL: $MOODLE_URL"
echo "Using SHA256 checksum: $MOODLE_CHECKSUM"

# Create working directory
mkdir -p "$ANSIBLE_DIR/templates"

# Create Ansible inventory file
cat > "$INVENTORY_FILE" << 'EOF'
[moodle_server]
localhost ansible_connection=local
EOF

# Create Ansible vars file
cat > "$VARS_FILE" << 'EOF'
moodle_db_name: moodle
moodle_db_user: moodleuser
moodle_db_password: pirineus
server_ip: localhost
apache_log_dir: /var/log/apache2
EOF

# Create Apache virtual host template
cat > "$VHOST_FILE" << 'EOF'
<VirtualHost *:80>
    ServerName {{ server_ip }}
    DocumentRoot /var/www/html/moodle

    <Directory /var/www/html/moodle>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog {{ apache_log_dir }}/moodle_error.log
    CustomLog {{ apache_log_dir }}/moodle_access.log combined
</VirtualHost>
EOF

# Create Ansible playbook with dynamic Moodle URL and checksum
cat > "$PLAYBOOK_FILE" << EOF
---
- name: Instalación y configuración completa de Moodle
  hosts: moodle_server
  become: yes
  vars_files:
    - vars.yml

  tasks:
    - name: Actualizar lista de paquets
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Instalar paquets essencials
      apt:
        name:
          - apache2
          - mariadb-server
          - mariadb-client
          - php
          - libapache2-mod-php
          - php-mysql
          - php-xml
          - php-mbstring
          - php-curl
          - php-zip
          - php-gd
          - php-intl
          - php-soap
          - php-json
          - php-cli
          - python3-pymysql
        state: present

    - name: Iniciar y habilitar Apache2
      systemd:
        name: apache2
        state: started
        enabled: yes

    - name: Iniciar y habilitar MariaDB
      systemd:
        name: mariadb
        state: started
        enabled: yes

    - name: Configurar php.ini
      lineinfile:
        path: /etc/php/8.1/apache2/php.ini
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^memory_limit =', line: 'memory_limit = 256M' }
        - { regexp: '^upload_max_filesize =', line: 'upload_max_filesize = 100M' }
        - { regexp: '^post_max_size =', line: 'post_max_size = 100M' }
        - { regexp: '^max_execution_time =', line: 'max_execution_time = 300' }
        - { regexp: '^max_input_vars =', line: 'max_input_vars = 5000' }
      notify: Reiniciar Apache2

    - name: Crear base de datos Moodle
      mysql_db:
        name: "{{ moodle_db_name }}"
        encoding: utf8mb4
        collation: utf8mb4_unicode_ci
        state: present
        login_unix_socket: /var/run/mysqld/mysqld.sock
      become_user: root
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Crear usuario de base de datos Moodle
      mysql_user:
        name: "{{ moodle_db_user }}"
        password: "{{ moodle_db_password }}"
        priv: "{{ moodle_db_name }}.*:ALL"
        host: localhost
        state: present
        login_unix_socket: /var/run/mysqld/mysqld.sock
      become_user: root
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Descargar Moodle
      get_url:
        url: "{{ MOODLE_URL }}"
        dest: "/tmp/{{ MOODLE_FILE }}"
        checksum: "sha256:{{ MOODLE_CHECKSUM }}"
        mode: '0644'

    - name: Descomprimir Moodle
      unarchive:
        src: "/tmp/{{ MOODLE_FILE }}"
        dest: "/tmp"
        remote_src: yes

    - name: Mover Moodle al directorio web
      command: mv /tmp/moodle /var/www/html/moodle
      args:
        creates: /var/www/html/moodle

    - name: Crear directorio moodledata
      file:
        path: /var/moodledata
        state: directory
        owner: www-data
        group: www-data
        mode: '0770'

    - name: Establecer permisos de Moodle
      file:
        path: /var/www/html/moodle
        owner: www-data
        group: www-data
        mode: '0755'
        recurse: yes

    - name: Establecer permisos del directorio web
      file:
        path: /var/www/html
        owner: www-data
        group: www-data
        mode: '0755'

    - name: Habilitar módulo rewrite de Apache
      apache2_module:
        name: rewrite
        state: present
      notify: Reiniciar Apache2

    - name: Copiar configuración virtual host de Moodle
      template:
        src: moodle-vhost.conf.j2
        dest: /etc/apache2/sites-available/moodle.conf
        owner: root
        group: root
        mode: '0644'
      notify: Reiniciar Apache2

    - name: Habilitar sitio Moodle
      command: a2ensite moodle.conf
      args:
        creates: /etc/apache2/sites-enabled/moodle.conf
      notify: Reiniciar Apache2

    - name: Deshabilitar sitio por defecto
      command: a2dissite 000-default.conf
      args:
        removes: /etc/apache2/sites-enabled/000-default.conf
      notify: Reiniciar Apache2

    - name: Comprobar si config.php ya existe
      stat:
        path: /var/www/html/moodle/config.php
      register: config_file_check

    - name: Crear variable de control para instalación CLI
      set_fact:
        exists_config: "{{ config_file_check.stat.exists }}"

    - name: Comprobar si hay tablas en la base de datos
      community.mysql.mysql_query:
        login_unix_socket: /var/run/mysqld/mysqld.sock
        login_user: "{{ moodle_db_user }}"
        login_password: "{{ moodle_db_password }}"
        query: "SHOW TABLES FROM {{ moodle_db_name }}"
      register: moodle_tables
      failed_when: false

    - name: Establecer variable si la base de datos está vacía
      set_fact:
        db_is_empty: "{{ moodle_tables.query_result | length == 0 }}"

    - name: Instalar Moodle automáticamente (CLI)
      command: >
        /usr/bin/php admin/cli/install.php
        --chmod=2770
        --lang=es
        --wwwroot=http://{{ server_ip }}
        --dataroot=/var/moodledata
        --dbtype=mariadb
        --dbhost=localhost
        --dbname={{ moodle_db_name }}
        --dbuser={{ moodle_db_user }}
        --dbpass={{ moodle_db_password }}
        --fullname="Plataforma Moodle"
        --shortname="Moodle"
        --adminuser=admin
        --adminpass=Admin1234!
        --adminemail=admin@example.com
        --non-interactive
        --agree-license
      args:
        chdir: /var/www/html/moodle
      become_user: www-data
      environment:
        PATH: "/usr/bin:/bin"
      when: not exists_config and db_is_empty

    - name: Asegurar permisos de moodledata
      file:
        path: /var/moodledata
        owner: www-data
        group: www-data
        mode: '0770'
        recurse: yes

    - name: Crear archivo config.php
      copy:
        content: |
          <?php
          unset(\\$CFG);
          global \\$CFG;
          \\$CFG = new stdClass();

          \\$CFG->dbtype    = 'mariadb';
          \\$CFG->dblibrary = 'native';
          \\$CFG->dbhost    = 'localhost';
          \\$CFG->dbname    = 'moodle';
          \\$CFG->dbuser    = 'moodleuser';
          \\$CFG->dbpass    = 'pirineus';
          \\$CFG->prefix    = '';
          \\$CFG->dboptions = array (
            'dbpersist' => 0,
            'dbport' => '',
            'dbsocket' => '',
          );

          \\$CFG->wwwroot   = 'http://localhost';
          \\$CFG->dataroot  = '/var/moodledata';
          \\$CFG->admin     = 'admin';

          \\$CFG->directorypermissions = 02770;

          require_once(__DIR__ . '/lib/setup.php');
        dest: /var/www/html/moodle/config.php
        owner: www-data
        group: www-data
        mode: '0644'
      when: not exists_config

  handlers:
    - name: Reiniciar Apache2
      systemd:
        name: apache2
        state: restarted
EOF

# Ensure correct permissions
chown -R root:root "$ANSIBLE_DIR"
chmod -R 755 "$ANSIBLE_DIR"

# Run the playbook
echo "Executing Moodle installation playbook..."
ansible-playbook -i "$INVENTORY_FILE" "$PLAYBOOK_FILE"

# Clean up temporary files
rm -f "/tmp/$MOODLE_FILE"

# Display completion message
echo "✅ Moodle installation completed!"
echo "Access Moodle at: http://localhost"
echo "Admin credentials: username=admin, password=Admin1234!" 
`
