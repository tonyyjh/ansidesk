export const moodleNginxPlaybook = `#!/bin/bash

# Script to fully automate Moodle installation using Ansible with Nginx
# Run this script as root or with sudo

# Exit on any error
set -e

# Define directories and files
WORKDIR="/root/moodle-ansible"
ANSIBLE_DIR="$WORKDIR/ansible"
PLAYBOOK_FILE="$ANSIBLE_DIR/moodle_playbook.yml"
INVENTORY_FILE="$ANSIBLE_DIR/hosts"
VARS_FILE="$ANSIBLE_DIR/vars.yml"
NGINX_TEMPLATE="$ANSIBLE_DIR/templates/moodle_nginx.conf.j2"

# Install required packages for downloading and parsing
echo "Installing required packages..."
apt update
apt install -y ansible python3-pymysql unzip curl

# Check disk space
echo "Checking disk space..."
df -h
if [ "$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)" -gt 90 ]; then
    echo "Error: Disk space is low. Free up space and try again."
    exit 1
fi

# Fix MariaDB data directory permissions
echo "Fixing MariaDB data directory permissions..."
sudo chown -R mysql:mysql /var/lib/mysql
sudo chmod -R 750 /var/lib/mysql

# Check for stuck MariaDB processes
echo "Checking for stuck MariaDB processes..."
if ps aux | grep -v grep | grep mysqld > /dev/null; then
    echo "Killing stuck MariaDB processes..."
    sudo killall -9 mysqld mysqld_safe || true
fi

# Check MariaDB service status
echo "Checking MariaDB service..."
if ! sudo systemctl is-active --quiet mariadb; then
    echo "MariaDB is not running. Attempting to start..."
    sudo systemctl start mariadb
    if ! sudo systemctl is-active --quiet mariadb; then
        echo "MariaDB failed to start. Checking logs..."
        sudo journalctl -xeu mariadb.service
        echo "Attempting to reinitialize MariaDB data directory..."
        sudo mv /var/lib/mysql /var/lib/mysql.bak || true
        sudo mkdir /var/lib/mysql
        sudo chown mysql:mysql /var/lib/mysql
        sudo chmod 750 /var/lib/mysql
        sudo mysql_install_db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
        sudo systemctl start mariadb
        if ! sudo systemctl is-active --quiet mariadb; then
            echo "Error: MariaDB still failed to start. Please check logs and resolve manually."
            exit 1
        fi
    fi
fi

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
php_version: "8.1"
EOF

# Create Nginx configuration template
cat > "$NGINX_TEMPLATE" << 'EOF'
server {
    listen 80;
    server_name {{ server_ip }};

    root /var/www/moodle;
    index index.php index.html;

    client_max_body_size 100M;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ [^/]\\.php(/|$) {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php{{ php_version }}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~* \\.(jpg|jpeg|gif|css|png|js|ico|webp|svg|ttf|woff|woff2|eot|otf|mp4|ogg|webm)$ {
        expires max;
        log_not_found off;
    }

    location ~ /\\.ht {
        deny all;
    }
}
EOF

# Create Ansible playbook with dynamic Moodle URL and checksum
cat > "$PLAYBOOK_FILE" << EOF
---
- name: Instalación y configuración completa de Moodle con Nginx
  hosts: moodle_server
  become: yes
  vars_files:
    - vars.yml
  vars:
    moodle_branch: MOODLE_45_STABLE

  tasks:
    - name: Actualizar lista de paquets
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Instalar paquets essencials
      apt:
        name:
          - unzip
          - curl
          - git
          - nginx
          - mariadb-server
          - php{{ php_version }}-fpm
          - php{{ php_version }}-mysql
          - php{{ php_version }}-xml
          - php{{ php_version }}-curl
          - php{{ php_version }}-zip
          - php{{ php_version }}-gd
          - php{{ php_version }}-mbstring
          - php{{ php_version }}-intl
          - php{{ php_version }}-soap
          - php{{ php_version }}-bcmath
          - php{{ php_version }}-cli
          - php{{ php_version }}-xmlrpc
          - php{{ php_version }}-readline
          - python3-pymysql
        state: present

    - name: Iniciar y habilitar Nginx
      systemd:
        name: nginx
        state: started
        enabled: yes

    - name: Iniciar y habilitar MariaDB
      systemd:
        name: mariadb
        state: started
        enabled: yes

    - name: Iniciar y habilitar PHP-FPM
      systemd:
        name: php{{ php_version }}-fpm
        state: started
        enabled: yes

    - name: Configurar php.ini
      lineinfile:
        path: /etc/php/{{ php_version }}/fpm/php.ini
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^memory_limit =', line: 'memory_limit = 256M' }
        - { regexp: '^upload_max_filesize =', line: 'upload_max_filesize = 100M' }
        - { regexp: '^post_max_size =', line: 'post_max_size = 100M' }
        - { regexp: '^max_execution_time =', line: 'max_execution_time = 300' }
        - { regexp: '^max_input_vars =', line: 'max_input_vars = 5000' }
      notify: Reiniciar PHP-FPM

    - name: Secure MariaDB installation
      block:
        - name: Set MariaDB root password
          mysql_user:
            name: root
            password: "{{ moodle_db_password }}"
            host: localhost
            state: present
            login_unix_socket: /var/run/mysqld/mysqld.sock
          become_user: root
          vars:
            ansible_python_interpreter: /usr/bin/python3
          ignore_errors: yes
        - name: Remove anonymous users
          mysql_user:
            name: ''
            host_all: yes
            state: absent
            login_user: root
            login_password: "{{ moodle_db_password }}"
            login_unix_socket: /var/run/mysqld/mysqld.sock
          become_user: root
          vars:
            ansible_python_interpreter: /usr/bin/python3
        - name: Disallow root login remotely
          mysql_user:
            name: root
            host: "%"
            state: absent
            login_user: root
            login_password: "{{ moodle_db_password }}"
            login_unix_socket: /var/run/mysqld/mysqld.sock
          become_user: root
          vars:
            ansible_python_interpreter: /usr/bin/python3
      rescue:
        - name: Log failure
          debug:
            msg: "MariaDB secure installation failed, continuing due to ignore_errors"
      ignore_errors: yes

    - name: Crear base de datos Moodle
      mysql_db:
        name: "{{ moodle_db_name }}"
        encoding: utf8mb4
        collation: utf8mb4_unicode_ci
        state: present
        login_user: root
        login_password: "{{ moodle_db_password }}"
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
        login_user: root
        login_password: "{{ moodle_db_password }}"
        login_unix_socket: /var/run/mysqld/mysqld.sock
      become_user: root
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Descargar Moodle
      get_url:
        url: "{{ MOODLE_URL }}"
        dest: /tmp/$MOODLE_FILE
        checksum: sha256:$MOODLE_CHECKSUM
        mode: '0644'

    - name: Descomprimir Moodle
      unarchive:
        src: /tmp/$MOODLE_FILE
        dest: /tmp
        remote_src: yes

    - name: Mover Moodle al directorio web
      command: mv /tmp/moodle /var/www/moodle
      args:
        creates: /var/www/moodle

    - name: Crear directorio moodledata
      file:
        path: /var/moodledata
        state: directory
        owner: www-data
        group: www-data
        mode: '0770'
    - name: Establecer permisos de Moodle
      file:
        path: /var/www/moodle
        owner: www-data
        group: www-data
        mode: '0755'
        recurse: yes

    - name: Set Moodle file permissions
      command: find /var/www/moodle -type f -exec chmod 0644 {} \\;

    - name: Set Moodle directory permissions
      command: find /var/www/moodle -type d -exec chmod 0755 {} \\;

    - name: Crear configuración de Nginx para Moodle
      template:
        src: moodle_nginx.conf.j2
        dest: /etc/nginx/sites-available/moodle
        owner: root
        group: root
        mode: '0644'
      notify: Reload Nginx

    - name: Habilitar sitio Moodle
      file:
        src: /etc/nginx/sites-available/moodle
        dest: /etc/nginx/sites-enabled/moodle
        state: link
      notify: Reload Nginx

    - name: Test Nginx configuration
      command: nginx -t
      changed_when: false

    - name: Comprobar si config.php ya existe
      stat:
        path: /var/www/moodle/config.php
      register: config_file_check

    - name: Crear variable de control para instalación CLI
      set_fact:
        exists_config: "{{ config_file_check.stat.exists }}"

    - name: Comprobar si hay tablas en la base de datos
      community.mysql.mysql_query:
        login_user: "{{ moodle_db_user }}"
        login_password: "{{ moodle_db_password }}"
        login_unix_socket: /var/run/mysqld/mysqld.sock
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
        chdir: /var/www/moodle
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
        dest: /var/www/moodle/config.php
        owner: www-data
        group: www-data
        mode: '0644'
      when: not exists_config

  handlers:
    - name: Reload Nginx
      service:
        name: nginx
        state: reloaded

    - name: Reiniciar PHP-FPM
      service:
        name: php{{ php_version }}-fpm
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


