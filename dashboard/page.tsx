"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Server, Power, PowerOff, MoreVertical, Trash2, ExternalLink } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

// Define la estructura de los datos de las máquinas virtuales
interface VM {
  id: number
  name: string
  service: string
  status: "running" | "stopped"
  ip: string
  specs: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [vms, setVms] = useState<VM[]>([]) // Estado para almacenar las máquinas virtuales
  const [loading, setLoading] = useState(true) // Estado para manejar el estado de carga
  const [error, setError] = useState<string | null>(null) // Estado para manejar errores

  // Obtener las máquinas desde el backend Flask
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const user_id = Number(localStorage.getItem("user_id"))

        if (!user_id || isNaN(user_id)) {
          // Si no hay user_id, redirigir al inicio de sesión
          router.push("/login")
          return
        }

        const response = await fetch(`/api/machines/user/${user_id}`)
        const data = await response.json() // Recibimos los datos de las máquinas
        if (!response.ok) {
          if (response.status === 404) {
            // Si no hay máquinas, mostrar mensaje amigable
            setVms([])
          } else {
            throw new Error("Error al obtener las máquinas virtuales")
          }
        } else {
          setVms(data) // Guardamos las máquinas en el estado
        }
      } catch (err) {
        console.error("Error fetching machines:", err)
        setError("No se pudieron cargar las máquinas virtuales. Inténtalo más tarde.")
      } finally {
        setLoading(false)
      }
    }

    fetchMachines()
  }, [router])

  const toggleVMStatus = async (vmId: number) => {
    try {
      const user_id = Number(localStorage.getItem("user_id"))
      if (!user_id || isNaN(user_id)) {
        throw new Error("Usuario no autenticado")
      }

      const res = await fetch(`/api/machines/${vmId}/user/${user_id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        throw new Error("Error al cambiar el estado de la máquina")
      }

      const result = await res.json()

      setVms((prevVms) => prevVms.map((vm) => (vm.id === vmId ? { ...vm, status: result.new_status } : vm)))

      toast({
        title: "Estado actualizado",
        description: result.message,
      })
    } catch (error: any) {
      console.error("Error cambiando estado:", error.message)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const deleteVM = async (vmId: number) => {
    try {
      const user_id = Number(localStorage.getItem("user_id"))
      if (!user_id || isNaN(user_id)) {
        throw new Error("Usuario no autenticado")
      }

      const res = await fetch(`/api/machines/${vmId}/user/${user_id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("No se pudo eliminar la máquina")

      setVms((prevVms) => prevVms.filter((vm) => vm.id !== vmId))

      toast({
        title: "Máquina eliminada",
        description: "La máquina virtual ha sido eliminada correctamente.",
      })
    } catch (error: any) {
      console.error("Error eliminando VM:", error.message)
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const connectToVM = async (idvm: number) => {
    try {
      const userId = Number(localStorage.getItem("user_id"))
      if (!userId || isNaN(userId)) throw new Error("User ID inválido")

      // Verificar que la máquina esté encendida
      const vm = vms.find((vm) => vm.id === idvm)
      if (!vm) throw new Error("Máquina no encontrada")

      if (vm.status !== "running") {
        toast({
          title: "Error de conexión",
          description: "La máquina debe estar encendida para conectarse",
          variant: "destructive",
        })
        return
      }

      const newWindow = window.open("", "_blank")
      if (!newWindow) throw new Error("El navegador bloqueó la nueva pestaña")

      // Obtener URL de conexión VNC
      const response = await fetch(`/api/machines/${userId}/novnc-url/${idvm}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "No se pudo obtener la información de conexión")
      }

      const data = await response.json()
      newWindow.location.href = data.novnc_url
    } catch (error: any) {
      console.error("Error conectando a la VM:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo abrir la consola VNC.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Cargando máquinas virtuales...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Mis Máquinas Virtuales</h2>
        <Link href="/dashboard/crear-maquina" passHref>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear Máquina
          </Button>
        </Link>
      </div>

      {vms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No tienes máquinas virtuales</h3>
            <p className="text-muted-foreground mb-6">Crea tu primera máquina virtual para comenzar</p>
            <Link href="/dashboard/crear-maquina" passHref>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Máquina
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vms.map((vm) => (
            <Card key={vm.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{vm.name}</CardTitle>
                    <CardDescription>{vm.service}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Opciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleVMStatus(vm.id)}>
                        {vm.status === "running" ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            <span>Detener</span>
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            <span>Iniciar</span>
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => connectToVM(vm.id)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>Conectar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteVM(vm.id)} className="text-red-500 focus:text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Eliminar</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge variant={vm.status === "running" ? "default" : "secondary"}>
                      {vm.status === "running" ? "Activo" : "Detenido"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => toggleVMStatus(vm.id)}>
                  {vm.status === "running" ? (
                    <>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Detener
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4" />
                      Iniciar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => connectToVM(vm.id)}
                  disabled={vm.status !== "running"}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Conectar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
