// Script de instalación de WordPress
export const wordpressPlaybook = `#!/bin/bash

# Script to fully automate WordPress installation
# Run this script as root or with sudo

# Exit on any error
set -e

# Variables (serán reemplazadas por los valores del formulario)
DB_NAME="wordpress"
DB_USER="wpuser"
DB_PASSWORD="wppassword"
WP_ADMIN_USER="admin"
WP_ADMIN_PASSWORD="Admin1234!"
WP_SITE_TITLE="Mi Sitio WordPress"
WP_ADMIN_EMAIL="admin@example.com"
APACHE_LOG_DIR="/var/log/apache2"  # Declare APACHE_LOG_DIR variable

# Define directories and files
WORKDIR="/root/wordpress-install"
ANSIBLE_DIR="$WORKDIR/ansible"
PLAYBOOK_FILE="$ANSIBLE_DIR/wordpress_playbook.yml"
INVENTORY_FILE="$ANSIBLE_DIR/hosts"
VARS_FILE="$ANSIBLE_DIR/vars.yml"
VHOST_FILE="$ANSIBLE_DIR/templates/wordpress-vhost.conf.j2"

# Install required packages
echo "Installing required packages..."
apt update
apt install -y ansible python3-pymysql unzip curl

# Create working directory
mkdir -p "$ANSIBLE_DIR/templates"

# Create Ansible inventory file
cat > "$INVENTORY_FILE" << 'EOF'
[wordpress_server]
localhost ansible_connection=local
EOF

# Create Ansible vars file
cat > "$VARS_FILE" << EOF
db_name: $DB_NAME
db_user: $DB_USER
db_password: $DB_PASSWORD
wp_admin_user: $WP_ADMIN_USER
wp_admin_password: $WP_ADMIN_PASSWORD
wp_site_title: "$WP_SITE_TITLE"
wp_admin_email: $WP_ADMIN_EMAIL
server_ip: localhost
EOF

# Create Apache virtual host template
cat > "$VHOST_FILE" << 'EOF'
<VirtualHost *:80>
    ServerName {{ server_ip }}
    DocumentRoot /var/www/html/wordpress

    <Directory /var/www/html/wordpress>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog {{ APACHE_LOG_DIR }}/wordpress_error.log
    CustomLog {{ APACHE_LOG_DIR }}/wordpress_access.log combined
</VirtualHost>
EOF

# Create Ansible playbook
cat > "$PLAYBOOK_FILE" << 'EOF'
---
- name: Instalación y configuración completa de WordPress
  hosts: wordpress_server
  become: yes
  vars_files:
    - vars.yml

  tasks:
    - name: Actualizar lista de paquetes
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Instalar paquetes esenciales
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
        - { regexp: '^memory_limit =', line: 'memory_limit = 128M' }
        - { regexp: '^upload_max_filesize =', line: 'upload_max_filesize = 64M' }
        - { regexp: '^post_max_size =', line: 'post_max_size = 64M' }
        - { regexp: '^max_execution_time =', line: 'max_execution_time = 300' }
      notify: Reiniciar Apache2

    - name: Crear base de datos WordPress
      mysql_db:
        name: "{{ db_name }}"
        encoding: utf8mb4
        collation: utf8mb4_unicode_ci
        state: present
        login_unix_socket: /var/run/mysqld/mysqld.sock
      become_user: root
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Crear usuario de base de datos WordPress
      mysql_user:
        name: "{{ db_user }}"
        password: "{{ db_password }}"
        priv: "{{ db_name }}.*:ALL"
        host: localhost
        state: present
        login_unix_socket: /var/run/mysqld/mysqld.sock
      become_user: root
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Descargar WordPress
      get_url:
        url: https://wordpress.org/latest.tar.gz
        dest: /tmp/wordpress.tar.gz
        mode: '0644'

    - name: Descomprimir WordPress
      unarchive:
        src: /tmp/wordpress.tar.gz
        dest: /tmp
        remote_src: yes

    - name: Mover WordPress al directorio web
      command: mv /tmp/wordpress /var/www/html/wordpress
      args:
        creates: /var/www/html/wordpress

    - name: Establecer permisos de WordPress
      file:
        path: /var/www/html/wordpress
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

    - name: Copiar configuración virtual host de WordPress
      template:
        src: wordpress-vhost.conf.j2
        dest: /etc/apache2/sites-available/wordpress.conf
        owner: root
        group: root
        mode: '0644'
      notify: Reiniciar Apache2

    - name: Habilitar sitio WordPress
      command: a2ensite wordpress.conf
      args:
        creates: /etc/apache2/sites-enabled/wordpress.conf
      notify: Reiniciar Apache2

    - name: Deshabilitar sitio por defecto
      command: a2dissite 000-default.conf
      args:
        removes: /etc/apache2/sites-enabled/000-default.conf
      notify: Reiniciar Apache2

    - name: Crear archivo wp-config.php
      copy:
        content: |
          <?php
          define('DB_NAME', '{{ db_name }}');
          define('DB_USER', '{{ db_user }}');
          define('DB_PASSWORD', '{{ db_password }}');
          define('DB_HOST', 'localhost');
          define('DB_CHARSET', 'utf8mb4');
          define('DB_COLLATE', '');

          {{ lookup('url', 'https://api.wordpress.org/secret-key/1.1/salt/') }}

          $table_prefix = 'wp_';

          define('WP_DEBUG', false);

          if (!defined('ABSPATH')) {
              define('ABSPATH', dirname(__FILE__) . '/');
          }

          require_once(ABSPATH . 'wp-settings.php');
        dest: /var/www/html/wordpress/wp-config.php
        owner: www-data
        group: www-data
        mode: '0644'

    - name: Descargar WP-CLI
      get_url:
        url: https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
        dest: /usr/local/bin/wp
        mode: '0755'

    - name: Instalar WordPress con WP-CLI
      command: >
        wp core install
        --url=http://localhost
        --title="{{ wp_site_title }}"
        --admin_user={{ wp_admin_user }}
        --admin_password={{ wp_admin_password }}
        --admin_email={{ wp_admin_email }}
        --skip-email
      args:
        chdir: /var/www/html/wordpress
      become_user: www-data
      environment:
        PATH: "/usr/bin:/bin"

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
echo "Executing WordPress installation playbook..."
ansible-playbook -i "$INVENTORY_FILE" "$PLAYBOOK_FILE"

# Clean up temporary files
rm -f "/tmp/wordpress.tar.gz"

# Display completion message
echo "✅ WordPress installation completed!"
echo "Access WordPress at: http://localhost"
echo "Admin credentials: username=$WP_ADMIN_USER, password=$WP_ADMIN_PASSWORD"
`
