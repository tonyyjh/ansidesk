# Descripción
Plataforma de Alojamiento Gestionado para Máquinas Virtuales en la Nube.

# Resumen 
Este proyecto tiene como objetivo ofrecer un servicio de alojamiento gestionado para máquinas virtuales en la nube, empleando herramientas de código abierto para proporcionar una solución rentable, flexible y segura. Se busca atender las necesidades de pequeñas empresas, desarrolladores y usuarios que requieren control sobre sus entornos sin enfrentarse a la complejidad de la gestión de infraestructura.

El proyecto se basa en el uso de Proxmox para la administración de máquinas virtuales con alta disponibilidad, Ansible para la automatización de despliegues y Zabbix para el monitoreo del rendimiento. Entre otras muchas cosas que tenemos pensado implementar a lo largo del proyecto. Esto permitirá ofrecer entornos preconfigurados y optimizados a un costo inferior en comparación con soluciones en nubes públicas.

Los usuarios que contraten este servicio deberán acceder a un formulario desde una página web alojada en nuestro dominio ansidesk.cat. Desde esa página, los usuarios solicitarán las máquinas virtuales que deseen crear según sus necesidades. Además, dependiendo de los servicios que deseen, recomendaremos al usuario unos recursos mínimos u otros distintos.

# Introducción 
Contexto 
En los últimos años, hemos notado que la administración de infraestructuras en la nube ha avanzado bastante. Hay empresas que ya "disponen de este servicio", como AWS, Google Cloud o Azure. Sin embargo, los servicios que ofrecen estas empresas pueden resultar costosos y difíciles de gestionar para pequeñas empresas y desarrolladores que buscan simplemente más control sobre sus entornos sin una curva de aprendizaje tan alta.

Justificación 
Este proyecto busca llenar un nicho en el mercado al proporcionar una solución accesible basada en software de código abierto. Mediante la automatización y la monitorización avanzada, los usuarios podrán desplegar sus entornos con facilidad, minimizando costos operativos y complejidades técnicas.

# Objetivos 
Objetivo General 
Desarrollar y ofrecer una plataforma de alojamiento gestionado para máquinas virtuales en la nube, garantizando alta disponibilidad, seguridad y facilidad de uso.

Objetivos Específicos 
- Implementar Proxmox como plataforma base para la gestión de máquinas virtuales.
- Automatizar la configuración y despliegue de entornos con Ansible.
- Integrar Zabbix para la monitorización y garantía de rendimiento.
- Ofrecer plantillas preconfiguradas optimizadas para distintos casos de uso.
- Desarrollar una interfaz web intuitiva para la gestión y de los entornos.

# Alcance y Límites 
Alcance 
- Implementación de una infraestructura de alojamiento en la nube con herramientas de código abierto.
- Provisión de entornos preconfigurados optimizados para diferentes aplicaciones.
- Automatización del despliegue y gestión de servidores virtuales.
- Monitorización del rendimiento y disponibilidad en tiempo real.

Exclusiones 
- No se ofrecerá soporte para software propietario.
- No se incluirá gestión de infraestructura física (hardware).
- No se desarrollará una solución completamente personalizada para cada cliente.

# Metodología y Plan de Trabajo 
Método de trabajo 
Se empleará un enfoque iterativo basado en metodologías ágiles, con entregas progresivas que permitan validar cada fase del proyecto en este caso la aplicación Youtrack.

Fases y Actividades 
El proyecto tiene una duración aproximada de 3 meses y se dividirá en 5 fases distintas:

- Fase previa (PreBriefing): En esta fase nos explicarán las metodologías que utilizaremos a lo largo del proyecto, presentaremos la idea del grupo, elaboraremos el ProductBacklog y se elegirá el tutor del proyecto.
- Sprint 1: En esta fase realizaremos las tareas definidas en el ProductBacklog para este periodo. Además, tendremos reuniones con el tutor, Sprint Grooming, Demo, Sprint Review y Sprint Retrospective.
- Sprint 2: En esta fase ejecutaremos las tareas asignadas en el ProductBacklog para este periodo y llevaremos a cabo las mismas reuniones que en el Sprint 1.
- Sprint 3: En esta fase completaremos las tareas establecidas en el ProductBacklog para este periodo y realizaremos las mismas reuniones que en el Sprint 1.
- Presentación del proyecto: En esta fase defenderemos el proyecto mediante una presentación y una demostración clara y estructurada.

En el proyecto realizaremos las siguientes actividades, organizadas en tareas principales y subtareas:

- Análisis y Planificación: Definiremos los requisitos y diseñaremos la arquitectura del sistema.
- Implementación de Infraestructura: Configuraremos Proxmox y automatizaremos procesos con Ansible.
- Monitorización y Seguridad: Integraremos Zabbix y aplicaremos medidas de seguridad.
- Desarrollo de Plataforma Web: Crearemos la interfaz de usuario de la plataforma.
- Pruebas y Optimización: Evaluaremos el rendimiento y realizaremos ajustes finales.
- Preparación de la defensa: Elaboraremos una presentación y una demostración clara y estructurada.

# Recursos y Presupuesto 
Recursos Humanos y Materiales 
- Tres alumnos del curso de ASIX2.
- Cuatro escritorios de trabajo para cada alumno.
- Un disco SSD para el servidor Proxmox y almacenamiento en la nube.

Presupuesto 
Costos de hardware, hemos puesto dos opciones:

Opción 1: SSD1 con Carcasa1 (Aprox 40€).
Opción 2: SSD2 con Carcasa2 (Aprox 50€).

# Cronograma y Entregables 
Línea de Tiempo 
Fases	        Duración
PreBriefing	  48 horas
Sprint 1	    48 horas
Sprint 2	    72 horas
Sprint 3	    55 horas
Presentación	1/2 hora

Entregables 
Demostración de proyecto.
Documentación técnica.

# Conclusiones y Recomendaciones 
Este proyecto representa una solución innovadora y accesible para pequeñas empresas y desarrolladores que buscan control sobre sus entornos en la nube sin incurrir en altos costos.
Proyecto realizado por 3 estudiantes de ASIX2 en 2 meses y medio.
