"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Home, Server, User, LogOut, Plus } from "lucide-react"
import Image from "next/image"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-screen w-full flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
              <SidebarTrigger />
              <div className="flex flex-1 items-center justify-between">
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/perfil")}>
                    <User className="h-5 w-5" />
                    <span className="sr-only">Perfil</span>
                  </Button>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function AppSidebar() {
  const router = useRouter()

  return (
    <Sidebar variant="inset" className="h-screen">
    <SidebarHeader className="border-b p-4">
      <div className="flex items-center gap-2">
        <Image
          src="/logoANSIDESK.png"
          alt="Ansidesk Logo"
          width={140}
          height={32}
          className="dark:invert"
          priority
        />
      </div>
    </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push("/dashboard")} tooltip="Inicio">
                  <Home className="h-5 w-5" />
                  <span>Inicio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push("/dashboard/perfil")} tooltip="Perfil">
                  <User className="h-5 w-5" />
                  <span>Perfil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push("/dashboard/crear-maquina")} tooltip="Crear Máquina">
                  <Plus className="h-5 w-5" />
                  <span>Crear Máquinas/Servicios</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
      <Button
  variant="outline"
  className="w-full justify-start"
  onClick={() => {
    // Eliminar el user_id del localStorage
    localStorage.removeItem("user_id");
    // Redirigir al usuario a la página de inicio de sesión
    router.push("/login");
  }}
>
  <LogOut className="mr-2 h-4 w-4" />
  Cerrar Sesión
</Button>
      </SidebarFooter>
    </Sidebar>
  )
}