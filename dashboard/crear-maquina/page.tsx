"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Server, Database, CloudCog, Globe } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { moodlePlaybook } from "@/components/playbooks/moodle-playbook.js"

// Tipos para el formulario de servicios 
type Service = "moodle" | "dns" | "wordpress"
type WebServer = "apache" | "nginx" | null
type DatabaseType = "mysql" | null

// Tipo para los archivos adjuntos
interface MachineAttachment {
  id: string
  name: string
  size: number
  type: string
  file: File
}

// Configuración de servicios
interface ServiceConfig {
  name: string
  icon: React.ElementType
  description: string
  dependencies: {
    webServer?: boolean
    database?: boolean
    php?: boolean
    other?: string[]
  }
}

const serviceConfigurations: Record<Service, ServiceConfig> = {
  moodle: {
    name: "Moodle",
    icon: Globe,
    description: "Plataforma de aprendizaje de código abierto",
    dependencies: {
      webServer: true,
      database: true,
      php: true,
    },
  },
  dns: {
    name: "DNS",
    icon: Globe,
    description: "Servidor de nombres de dominio",
    dependencies: {
      other: ["bind9", "dnsmasq"],
    },
  },
  wordpress: {
    name: "WordPress",
    icon: Database,
    description: "Sistema de gestión de contenidos",
    dependencies: {
      webServer: true,
      database: true,
      php: true,
    },
  },
}

// Plantillas de máquinas virtuales
const serviceTemplates = [
  {
    id: "moodle",
    name: "Moodle",
    description: "Linux Ubuntu Cliente",
    icon: Globe,
    specs: { cpu: 2, ram: 4000, storage: 50000 },
    requiresPlaybook: true,
  },
  {
    id: "dns",
    name: "DNS Server",
    description: "Windows Server",
    icon: CloudCog,
    specs: { cpu: 2, ram: 4000, storage: 50000 },
    requiresPlaybook: true,
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Linux Ubuntu Cliente",
    icon: Database,
    specs: { cpu: 3, ram: 8000, storage: 10000 },
    requiresPlaybook: true,
  },
  {
    id: "custom",
    name: "Personalizado",
    description: "Configura tu propia máquina virtual",
    icon: Server,
    specs: { cpu: 2, ram: 2000, storage: 20000 },
    requiresPlaybook: false,
  },
]

// Interfaz para el estado del formulario de servicios
interface ServiceFormState {
  services: Service[]
  webServer: WebServer
  database: DatabaseType
  php: boolean
  phpExtensions: {
    required: Record<string, boolean>
    optional: Record<string, boolean>
  }
  otherDependencies: Record<string, boolean>
  submitting: boolean
  submitted: boolean
  errors: string[]
}

export default function CreateMachinePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [playbookRequired, setPlaybookRequired] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cpu: 2,
    ram: 2000,
    storage: 10000,
    os: "ubuntu-desktop",
    osVersion: "24",
    services: [] as string[],
    additionalConfig: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formErrors, setFormErrors] = useState({
    additionalConfig: "",
  })

  // Estado para los archivos adjuntos
  const [attachments, setAttachments] = useState<MachineAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string>("")

  // Estado para el formulario de servicios
  const [serviceFormState, setServiceFormState] = useState<ServiceFormState>({
    services: [],
    webServer: null,
    database: null,
    php: false,
    phpExtensions: {
      required: {
        "php-curl": false,
        "php-gd": false,
        "php-intl": false,
        "php-mbstring": false,
        "php-xml": false,
        "php-xmlrpc": false,
        "php-soap": false,
        "php-zip": false,
        "php-mysql": false,
        "php-pgsql": false,
      },
      optional: {
        "php-ldap": false,
        "php-opcache": false,
        "php-apcu": false,
        "php-redis": false,
        "php-memcached": false,
      },
    },
    otherDependencies: {
      bind9: false,
      dnsmasq: false,
      docker: false,
      "node.js": false,
    },
    submitting: false,
    submitted: false,
    errors: [],
  })

  // Añadir un nuevo estado para las variables de Moodle
  const [moodleVars, setMoodleVars] = useState({
    moodle_db_name: "moodle",
    moodle_db_user: "moodleuser",
    moodle_db_password: "pirineus",
    moodle_admin_user: "admin",
    moodle_admin_password: "Admin1234!",
    moodle_site_name: "Plataforma Moodle",
  })

  // Añadir una función para actualizar las variables de Moodle y el script en tiempo real
  const updateMoodleVars = (name: string, value: string) => {
    const newMoodleVars = { ...moodleVars, [name]: value }
    setMoodleVars(newMoodleVars)

    // Actualizar el script con las nuevas variables
    if (serviceFormState.services.includes("moodle") && serviceFormState.webServer === "apache") {
      let updatedScript = moodlePlaybook

      // Actualizar variables en el archivo vars.yml
      updatedScript = updatedScript.replace(
        /moodle_db_name: moodle/g,
        `moodle_db_name: ${newMoodleVars.moodle_db_name}`,
      )
      updatedScript = updatedScript.replace(
        /moodle_db_user: moodleuser/g,
        `moodle_db_user: ${newMoodleVars.moodle_db_user}`,
      )
      updatedScript = updatedScript.replace(
        /moodle_db_password: pirineus/g,
        `moodle_db_password: ${newMoodleVars.moodle_db_password}`,
      )

      // Actualizar variables en el comando de instalación CLI
      updatedScript = updatedScript.replace(/--adminuser=admin/g, `--adminuser=${newMoodleVars.moodle_admin_user}`)
      updatedScript = updatedScript.replace(
        /--adminpass=Admin1234!/g,
        `--adminpass=${newMoodleVars.moodle_admin_password}`,
      )
      updatedScript = updatedScript.replace(
        /--fullname="Plataforma Moodle"/g,
        `--fullname="${newMoodleVars.moodle_site_name}"`,
      )

      // Actualizar variables en el archivo config.php
      updatedScript = updatedScript.replace(
        /\\$CFG->dbname {4}= 'moodle'/g,
        `\\$CFG->dbname    = '${newMoodleVars.moodle_db_name}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbuser {4}= 'moodleuser'/g,
        `\\$CFG->dbuser    = '${newMoodleVars.moodle_db_user}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbpass {4}= 'pirineus'/g,
        `\\$CFG->dbpass    = '${newMoodleVars.moodle_db_password}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->admin {5}= 'admin'/g,
        `\\$CFG->admin     = '${newMoodleVars.moodle_admin_user}'`,
      )

      setFormData({
        ...formData,
        additionalConfig: updatedScript,
      })
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = serviceTemplates.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        cpu: template.specs.cpu,
        ram: template.specs.ram,
        storage: template.specs.storage,
      })
      setPlaybookRequired(template.requiresPlaybook)

      // Si se selecciona Moodle, configurar automáticamente el playbook
      if (templateId === "moodle") {
        // Obtener el playbook de Moodle desde el módulo importado
        setFormData({
          ...formData,
          cpu: template.specs.cpu,
          ram: template.specs.ram,
          storage: template.specs.storage,
          additionalConfig: moodlePlaybook,
        })

        // Configurar automáticamente los servicios para Moodle
        setServiceFormState({
          ...serviceFormState,
          services: ["moodle"],
          webServer: "apache",
          database: "mysql",
          php: true,
          phpExtensions: {
            ...serviceFormState.phpExtensions,
            required: {
              ...serviceFormState.phpExtensions.required,
              "php-curl": true,
              "php-gd": true,
              "php-intl": true,
              "php-mbstring": true,
              "php-xml": true,
              "php-soap": true,
              "php-zip": true,
              "php-mysql": true,
            },
            optional: {
              ...serviceFormState.phpExtensions.optional,
              "php-opcache": true,
            },
          },
        })
      }
    }
    setStep(2)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === "additionalConfig") {
      setFormErrors({ ...formErrors, additionalConfig: "" })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    // Si el campo es osVersion y el valor es "24", ajusta el nombre del archivo ISO
    if (name === "osVersion" && value === "24") {
      setFormData({ ...formData, [name]: value, os: "ubuntu-desktop" }) // Cambia el os a "ubuntu-desktop"
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleServiceToggle = (service: string) => {
    const services = formData.services.includes(service)
      ? formData.services.filter((s) => s !== service)
      : [...formData.services, service]
    setFormData({ ...formData, services })
  }

  // Funciones para el formulario de servicios
  const getRequiredExtensions = () => {
    const extensions: string[] = []

    if (serviceFormState.services.includes("moodle")) {
      extensions.push("php-curl", "php-gd", "php-intl", "php-mbstring", "php-xml", "php-soap", "php-zip", "php-xmlrpc")

      if (serviceFormState.database === "mysql") {
        extensions.push("php-mysql")
      } else if (serviceFormState.database === "postgresql") {
        extensions.push("php-pgsql")
      }
    }

    return extensions
  }

  // Modificar la función toggleService para actualizar el script cuando se selecciona Moodle
  const toggleService = (service: Service) => {
    const newServices = serviceFormState.services.includes(service)
      ? serviceFormState.services.filter((s) => s !== service)
      : [...serviceFormState.services, service]

    // Update required extensions based on selected services
    const requiredExtensions = getRequiredExtensions()
    const newRequiredExtensions = { ...serviceFormState.phpExtensions.required }

    // Reset all to false first
    Object.keys(newRequiredExtensions).forEach((ext) => {
      newRequiredExtensions[ext] = false
    })

    // Set required ones to true
    requiredExtensions.forEach((ext) => {
      if (newRequiredExtensions.hasOwnProperty(ext)) {
        newRequiredExtensions[ext] = true
      }
    })

    // Update other dependencies based on selected services
    const newOtherDependencies = { ...serviceFormState.otherDependencies }
    Object.keys(newOtherDependencies).forEach((dep) => {
      newOtherDependencies[dep] = false
    })

    // Set required dependencies for selected services
    newServices.forEach((service) => {
      const config = serviceConfigurations[service]
      if (config.dependencies.other) {
        config.dependencies.other.forEach((dep) => {
          if (newOtherDependencies.hasOwnProperty(dep)) {
            newOtherDependencies[dep] = true
          }
        })
      }
    })

    // Si se está seleccionando Moodle (no estaba antes y ahora sí)
    if (!serviceFormState.services.includes("moodle") && newServices.includes("moodle")) {
      // Actualizar el contenido del playbook en la configuración avanzada con las variables actuales
      let updatedScript = moodlePlaybook

      updatedScript = updatedScript.replace(/moodle_db_name: moodle/g, `moodle_db_name: ${moodleVars.moodle_db_name}`)
      updatedScript = updatedScript.replace(
        /moodle_db_user: moodleuser/g,
        `moodle_db_user: ${moodleVars.moodle_db_user}`,
      )
      updatedScript = updatedScript.replace(
        /moodle_db_password: pirineus/g,
        `moodle_db_password: ${moodleVars.moodle_db_password}`,
      )
      updatedScript = updatedScript.replace(/--adminuser=admin/g, `--adminuser=${moodleVars.moodle_admin_user}`)
      updatedScript = updatedScript.replace(
        /--adminpass=Admin1234!/g,
        `--adminpass=${moodleVars.moodle_admin_password}`,
      )
      updatedScript = updatedScript.replace(
        /--fullname="Plataforma Moodle"/g,
        `--fullname="${moodleVars.moodle_site_name}"`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbname {4}= 'moodle'/g,
        `\\$CFG->dbname    = '${moodleVars.moodle_db_name}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbuser {4}= 'moodleuser'/g,
        `\\$CFG->dbuser    = '${moodleVars.moodle_db_user}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbpass {4}= 'pirineus'/g,
        `\\$CFG->dbpass    = '${moodleVars.moodle_db_password}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->admin {5}= 'admin'/g,
        `\\$CFG->admin     = '${moodleVars.moodle_admin_user}'`,
      )

      setFormData({
        ...formData,
        additionalConfig: updatedScript,
      })
    } else if (serviceFormState.services.includes("moodle") && !newServices.includes("moodle")) {
      // Si se está deseleccionando Moodle, limpiar la configuración avanzada
      setFormData({
        ...formData,
        additionalConfig: "",
      })
    }

    // Si se está seleccionando Moodle, marcar automáticamente Apache, MySQL y PHP
    if (!serviceFormState.services.includes("moodle") && newServices.includes("moodle")) {
      setServiceFormState({
        ...serviceFormState,
        services: newServices,
        webServer: "apache", // Seleccionar Apache automáticamente
        database: "mysql", // Seleccionar MySQL automáticamente
        php: true, // Activar PHP
        phpExtensions: {
          ...serviceFormState.phpExtensions,
          required: {
            ...newRequiredExtensions,
            "php-curl": true,
            "php-gd": true,
            "php-intl": true,
            "php-mbstring": true,
            "php-xml": true,
            "php-soap": true,
            "php-zip": true,
            "php-mysql": true,
          },
          optional: {
            ...serviceFormState.phpExtensions.optional,
            "php-opcache": true,
          },
        },
        otherDependencies: newOtherDependencies,
      })
    } else {
      // Actualización normal para otros servicios
      setServiceFormState({
        ...serviceFormState,
        services: newServices,
        phpExtensions: {
          ...serviceFormState.phpExtensions,
          required: newRequiredExtensions,
        },
        otherDependencies: newOtherDependencies,
        // Si no hay servicios seleccionados, resetear dependencias
        ...(newServices.length === 0 && {
          webServer: null,
          database: null,
          php: false,
        }),
      })
    }
  }

  // Modificar la función setWebServer para actualizar el script cuando se selecciona Apache para Moodle
  const setWebServer = (server: WebServer) => {
    setServiceFormState({
      ...serviceFormState,
      webServer: server,
    })

    // Si se selecciona Apache para Moodle, actualizar el script en la configuración avanzada
    if (server === "apache" && serviceFormState.services.includes("moodle")) {
      // Actualizar el script con las variables actuales
      let updatedScript = moodlePlaybook

      updatedScript = updatedScript.replace(/moodle_db_name: moodle/g, `moodle_db_name: ${moodleVars.moodle_db_name}`)
      updatedScript = updatedScript.replace(
        /moodle_db_user: moodleuser/g,
        `moodle_db_user: ${moodleVars.moodle_db_user}`,
      )
      updatedScript = updatedScript.replace(
        /moodle_db_password: pirineus/g,
        `moodle_db_password: ${moodleVars.moodle_db_password}`,
      )
      updatedScript = updatedScript.replace(/--adminuser=admin/g, `--adminuser=${moodleVars.moodle_admin_user}`)
      updatedScript = updatedScript.replace(
        /--adminpass=Admin1234!/g,
        `--adminpass=${moodleVars.moodle_admin_password}`,
      )
      updatedScript = updatedScript.replace(
        /--fullname="Plataforma Moodle"/g,
        `--fullname="${moodleVars.moodle_site_name}"`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbname {4}= 'moodle'/g,
        `\\$CFG->dbname    = '${moodleVars.moodle_db_name}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbuser {4}= 'moodleuser'/g,
        `\\$CFG->dbuser    = '${moodleVars.moodle_db_user}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->dbpass {4}= 'pirineus'/g,
        `\\$CFG->dbpass    = '${moodleVars.moodle_db_password}'`,
      )
      updatedScript = updatedScript.replace(
        /\\$CFG->admin {5}= 'admin'/g,
        `\\$CFG->admin     = '${moodleVars.moodle_admin_user}'`,
      )

      setFormData({
        ...formData,
        additionalConfig: updatedScript,
      })
    }
  }

  const setDatabase = (db: DatabaseType) => {
    const newRequiredExtensions = { ...serviceFormState.phpExtensions.required }

    // Update database-specific PHP extensions
    newRequiredExtensions["php-mysql"] = db === "mysql"
    // Eliminamos la línea de PostgreSQL

    setServiceFormState({
      ...serviceFormState,
      database: db,
      phpExtensions: {
        ...serviceFormState.phpExtensions,
        required: newRequiredExtensions,
      },
    })
  }

  const togglePhp = () => {
    setServiceFormState({
      ...serviceFormState,
      php: !serviceFormState.php,
    })
  }

  const toggleOptionalExtension = (extension: string) => {
    setServiceFormState({
      ...serviceFormState,
      phpExtensions: {
        ...serviceFormState.phpExtensions,
        optional: {
          ...serviceFormState.phpExtensions.optional,
          [extension]: !serviceFormState.phpExtensions.optional[extension],
        },
      },
    })
  }

  const validateServiceForm = () => {
    const errors: string[] = []

    if (serviceFormState.services.includes("moodle")) {
      if (!serviceFormState.webServer) {
        errors.push("Debe seleccionar un servidor web (Apache o Nginx) para Moodle.")
      }

      if (!serviceFormState.database) {
        errors.push("Debe seleccionar una base de datos (MySQL/MariaDB o PostgreSQL) para Moodle.")
      }

      if (!serviceFormState.php) {
        errors.push("PHP es requerido para Moodle.")
      }
    }

    return errors
  }

  // Verificar si un servicio necesita configuración
  const needsConfiguration = (service: Service) => {
    return serviceFormState.services.includes(service)
  }

  const validateForm = () => {
    let valid = true
    const errors = { ...formErrors }

    if (playbookRequired && !formData.additionalConfig.trim()) {
      errors.additionalConfig = "El playbook de Ansible es obligatorio para esta plantilla"
      valid = false
    } else {
      errors.additionalConfig = ""
    }

    // Validar el formulario de servicios
    const serviceErrors = validateServiceForm()
    if (serviceErrors.length > 0) {
      setServiceFormState({
        ...serviceFormState,
        errors: serviceErrors,
      })
      valid = false
    }

    setFormErrors(errors)
    return valid
  }

  // Modificar la función handleSubmit para usar las variables de Moodle ya actualizadas
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setAttachmentError("")

    try {
      // No es necesario actualizar el script aquí, ya que se actualiza en tiempo real

      const userId = localStorage.getItem("user_id")
      if (!userId) throw new Error("No se encontró el ID de usuario en localStorage")

      const payload = {
        user_id: userId,
        name: formData.name,
        description: formData.description,
        cpu: formData.cpu,
        ram: formData.ram,
        storage: formData.storage,
        os: formData.os,
        osVersion: formData.osVersion,
        // Puedes expandir estos campos con lo que necesites del formulario
      }

      const response = await fetch("/api/create-machine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      console.log("Payload que se enviará:", payload)
      if (!response.ok) {
        let errorMessage = "Error al crear la máquina virtual"
        const responseClone = response.clone() // clonar respuesta para poder leer dos veces

        try {
          const errorData = await response.json()
          if (errorData?.error) errorMessage = errorData.error
        } catch (jsonError) {
          // Si no es JSON, leer la copia como texto
          const text = await responseClone.text()
          if (text) errorMessage = text
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 200)
    } catch (err) {
      console.error("❌ Error creando máquina:", err)
      setAttachmentError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-green-100 p-3 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">¡Máquina creada con éxito!</h2>
        <p className="text-muted-foreground mb-6 text-center">
          Tu máquina virtual está siendo desplegada en Proxmox. Serás redirigido al dashboard en unos momentos.
        </p>
        {attachmentError && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{attachmentError}</AlertDescription>
          </Alert>
        )}
        <Button onClick={() => router.push("/dashboard")}>Ir al Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Crear Máquina Virtual</h2>
        <p className="text-muted-foreground">
          Configura y despliega una nueva máquina virtual en Proxmox con los servicios que necesites
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Paso 1: Selecciona una plantilla</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {serviceTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedTemplate === template.id ? "border-2 border-primary" : ""
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <template.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mb-2">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                  <div className="mt-4 text-sm">
                    <p>{template.specs.cpu} vCPU</p>
                    <p>{template.specs.ram}GB RAM</p>
                    <p>{template.specs.storage}GB SSD</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-xl font-semibold">Paso 2: Configura tu máquina virtual</h3>

          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList>
              <TabsTrigger value="basic">Información Básica</TabsTrigger>
              <TabsTrigger value="resources">Recursos</TabsTrigger>
              <TabsTrigger value="services">Servicios</TabsTrigger>
              <TabsTrigger value="advanced">Configuración Avanzada</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información Básica</CardTitle>
                  <CardDescription>Proporciona la información básica para tu máquina virtual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la máquina</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Mi Servidor Web"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Servidor web para mi aplicación"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="os">Sistema Operativo</Label>
                      <Select value={formData.os} onValueChange={(value) => handleSelectChange("os", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un SO" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ubuntu-desktop">Ubuntu Cliente</SelectItem>
                          <SelectItem value="ubuntu-server">Ubuntu Server</SelectItem>
                          <SelectItem value="Windows 10">Windows 10</SelectItem>
                          <SelectItem value="windows">Windows Server</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="osVersion">Versión</Label>
                      <Select
                        value={formData.osVersion}
                        onValueChange={(value) => handleSelectChange("osVersion", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una versión" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.os === "windows" ? (
                            <>
                              <SelectItem value="2019">2019</SelectItem>
                            </>
                          ) : formData.os === "Windows 10" ? (
                            <>
                              <SelectItem value="2015">2015</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="24">24.04 LTS</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recursos</CardTitle>
                  <CardDescription>Configura los recursos para tu máquina virtual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpu">CPU (vCores)</Label>
                    <Select
                      value={formData.cpu.toString()}
                      onValueChange={(value) => setFormData({ ...formData, cpu: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona núcleos de CPU" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 vCore</SelectItem>
                        <SelectItem value="2">2 vCores</SelectItem>
                        <SelectItem value="3">3 vCores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ram">Memoria RAM</Label>
                    <Select
                      value={formData.ram.toString()}
                      onValueChange={(value) => setFormData({ ...formData, ram: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona memoria RAM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2000">2 GB</SelectItem>
                        <SelectItem value="4000">4 GB</SelectItem>
                        <SelectItem value="8000">8 GB</SelectItem>
                        <SelectItem value="16000">16 GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage">Almacenamiento</Label>
                    <Select
                      value={formData.storage.toString()}
                      onValueChange={(value) => setFormData({ ...formData, storage: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona almacenamiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10000">10 GB</SelectItem>
                        <SelectItem value="20000">20 GB</SelectItem>
                        <SelectItem value="40000">40 GB</SelectItem>
                        <SelectItem value="80000">80 GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Servicios</CardTitle>
                  <CardDescription>Configura los servicios que deseas instalar en tu máquina virtual</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Error messages */}
                  {serviceFormState.errors.length > 0 && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-5">
                          {serviceFormState.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Main services selection */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold">Selección de Servicios</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {(Object.keys(serviceConfigurations) as Service[]).map((service) => (
                        <Card
                          key={service}
                          className={`${serviceFormState.services.includes(service) ? "border-primary" : ""}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={service}
                                checked={serviceFormState.services.includes(service)}
                                onCheckedChange={() => toggleService(service)}
                              />
                              <div className="flex items-center space-x-2">
                                {React.createElement(serviceConfigurations[service].icon, {
                                  className: "h-5 w-5 text-primary",
                                })}
                                <Label htmlFor={service} className="font-medium">
                                  {serviceConfigurations[service].name}
                                </Label>
                              </div>
                              <span className="text-sm text-muted-foreground ml-2">
                                {serviceConfigurations[service].description}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 ml-auto">
                                En proceso
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {serviceFormState.services.length > 0 && (
                    <Accordion type="multiple" className="w-full">
                      {/* Moodle Configuration */}
                      {needsConfiguration("moodle") && (
                        <AccordionItem value="moodle-config" className="border rounded-lg p-2">
                          <AccordionTrigger className="px-4">
                            <div className="flex items-center">
                              <Globe className="h-5 w-5 mr-2 text-primary" />
                              <span>Configuración de Moodle</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-4 pb-2 space-y-6">
                            {/* Web server selection */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-medium">Servidor Web (Obligatorio)</h4>
                              <RadioGroup
                                value={serviceFormState.webServer || ""}
                                onValueChange={(value) => setWebServer(value as WebServer)}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="apache" id="apache" />
                                    <Label htmlFor="apache">Apache</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="nginx" id="nginx" />
                                    <Label htmlFor="nginx">Nginx</Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            </div>

                            {/* Database selection - only MariaDB */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-medium">Base de Datos (Obligatorio)</h4>
                              <RadioGroup
                                value={serviceFormState.database || ""}
                                onValueChange={(value) => setDatabase(value as DatabaseType)}
                              >
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mysql" id="mysql" />
                                    <Label htmlFor="mysql">MariaDB</Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            </div>

                            {/* PHP selection */}
                            {serviceFormState.webServer === "apache" && (
                              <div className="space-y-4">
                                <h4 className="text-lg font-medium">PHP (Incluido con Moodle Apache)</h4>
                                <div className="bg-muted p-4 rounded-md">
                                  <p className="text-sm">
                                    La instalación de Moodle con Apache incluirá automáticamente:
                                  </p>
                                  <ul className="list-disc pl-5 mt-2 text-sm">
                                    <li>PHP versión compatible</li>
                                    <li>
                                      Extensiones requeridas: php-curl, php-gd, php-intl, php-mbstring, php-xml,
                                      php-soap, php-zip, php-mysql
                                    </li>
                                    <li>Extensión opcional: php-opcache (recomendada para mejor rendimiento)</li>
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* PHP Extensions */}
                            {/*{serviceFormState.php && (
                              <div className="space-y-4">
                                <h4 className="text-lg font-medium">Extensiones PHP</h4>

                                {/* Required extensions */}
                            {/*<div className="space-y-2">
                                    <h5 className="text-md font-medium">Extensiones Obligatorias</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {Object.entries(serviceFormState.phpExtensions.required)
                                        .filter(([_, isRequired]) => isRequired)
                                        .map(([extension]) => (
                                          <div key={extension} className="flex items-center space-x-2">
                                            <Checkbox id={extension} checked={true} disabled={true} />
                                            <Label htmlFor={extension}>{extension}</Label>
                                          </div>
                                        ))}
                                    </div>

                                {/* Optional extensions */}
                            {/*<div className="space-y-2">
                                    <h5 className="text-md font-medium">Extensiones Opcionales</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {Object.entries(serviceFormState.phpExtensions.optional).map(
                                        ([extension, isChecked]) => (
                                          <div key={extension} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={extension}
                                              checked={isChecked}
                                              onCheckedChange={() => toggleOptionalExtension(extension)}
                                            />
                                            <Label htmlFor={extension}>{extension}</Label>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            */}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* DNS Configuration */}
                      {needsConfiguration("dns") && (
                        <AccordionItem value="dns-config" className="border rounded-lg p-2">
                          <AccordionTrigger className="px-4">
                            <div className="flex items-center">
                              <Globe className="h-5 w-5 mr-2 text-primary" />
                              <span>Configuración de DNS</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-4 pb-2 space-y-6">
                            <div className="space-y-4">
                              <h4 className="text-lg font-medium">Servicios DNS (Obligatorio)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {["bind9", "dnsmasq"].map((dep) => (
                                  <div key={dep} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={dep}
                                      checked={serviceFormState.otherDependencies[dep]}
                                      disabled={true}
                                    />
                                    <Label htmlFor={dep}>{dep}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* WordPress Configuration */}
                      {needsConfiguration("wordpress") && (
                        <AccordionItem value="wordpress-config" className="border rounded-lg p-2">
                          <AccordionTrigger className="px-4">
                            <div className="flex items-center">
                              <Database className="h-5 w-5 mr-2 text-primary" />
                              <span>Configuración de WordPress</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-4 pb-2 space-y-6">
                            <div className="space-y-4">
                              <h4 className="text-lg font-medium">Servidor Web (Obligatorio)</h4>
                              <RadioGroup
                                value={serviceFormState.webServer || ""}
                                onValueChange={(value) => setWebServer(value as WebServer)}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="apache" id="wp-apache" />
                                    <Label htmlFor="wp-apache">Apache</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="nginx" id="wp-nginx" />
                                    <Label htmlFor="wp-nginx">Nginx</Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            </div>

                            <div className="space-y-4">
                              <h4 className="text-lg font-medium">Base de Datos (Obligatorio)</h4>
                              <RadioGroup
                                value={serviceFormState.database || ""}
                                onValueChange={(value) => setDatabase(value as DatabaseType)}
                              >
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mysql" id="wp-mysql" />
                                    <Label htmlFor="wp-mysql">MariaDB</Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Avanzada</CardTitle>
                  <CardDescription>Agrega configuración adicional con Ansible</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="additionalConfig">Playbook de Ansible</Label>
                      {serviceFormState.services.includes("moodle") && serviceFormState.webServer === "apache" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Restaurar el playbook original
                            setFormData({
                              ...formData,
                              additionalConfig: moodlePlaybook,
                            })
                          }}
                        >
                          Restaurar Playbook Original
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="additionalConfig"
                      name="additionalConfig"
                      value={formData.additionalConfig}
                      onChange={handleInputChange}
                      placeholder="---\n- name: Instalar nginx\n  hosts: all\n  become: true\n  tasks:\n    - name: Instalar nginx\n      apt:\n        name: nginx\n        state: present"
                      className="font-mono h-[300px]"
                    />
                    {formErrors.additionalConfig && (
                      <p className="text-sm text-red-600">{formErrors.additionalConfig}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Reemplazar el formulario de variables de Moodle con Apache para usar el estado y actualizar en tiempo real */}
          {serviceFormState.services.includes("moodle") && serviceFormState.webServer === "apache" && (
            <div className="mt-6 border rounded-lg p-4">
              <h4 className="text-lg font-medium mb-4">Variables para el script de instalación</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moodle_db_name">Nombre de la base de datos</Label>
                  <Input
                    id="moodle_db_name"
                    value={moodleVars.moodle_db_name}
                    onChange={(e) => updateMoodleVars("moodle_db_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moodle_db_user">Usuario de la base de datos</Label>
                  <Input
                    id="moodle_db_user"
                    value={moodleVars.moodle_db_user}
                    onChange={(e) => updateMoodleVars("moodle_db_user", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moodle_db_password">Contraseña de la base de datos</Label>
                  <Input
                    id="moodle_db_password"
                    value={moodleVars.moodle_db_password}
                    onChange={(e) => updateMoodleVars("moodle_db_password", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moodle_admin_user">Usuario administrador</Label>
                  <Input
                    id="moodle_admin_user"
                    value={moodleVars.moodle_admin_user}
                    onChange={(e) => updateMoodleVars("moodle_admin_user", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moodle_admin_password">Contraseña administrador</Label>
                  <Input
                    id="moodle_admin_password"
                    value={moodleVars.moodle_admin_password}
                    onChange={(e) => updateMoodleVars("moodle_admin_password", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moodle_site_name">Nombre del sitio</Label>
                  <Input
                    id="moodle_site_name"
                    value={moodleVars.moodle_site_name}
                    onChange={(e) => updateMoodleVars("moodle_site_name", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {attachmentError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{attachmentError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Volver
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Máquina Virtual"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
