import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4 max-w-full lg:max-w-7xl">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
  <Image
    src="/logoANSIDESK.png"
    alt="Ansidesk Logo"
    width={140}
    height={40}
    className="invert dark:invert-0" // 👈 se invierte en modo oscuro
  />
</Link>

          </div>

          <nav className="hidden md:flex space-x-8">
            <Link href="/#home" className="hover:text-primary-foreground/80">
              Inicio
            </Link>
            <Link href="/#about" className="hover:text-primary-foreground/80">
              Sobre Nosotros
            </Link>
            <Link href="/#contact" className="hover:text-primary-foreground/80">
              Contáctanos
            </Link>
          </nav>

          <div className="hidden md:flex space-x-4">
            <Button asChild variant="secondary">
              <Link href="/login">Inicia sesión</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/register">Registrate</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}