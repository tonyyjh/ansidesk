export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-6 w-full">
      <div className="container mx-auto text-center px-4 max-w-full lg:max-w-7xl">
        <p>© {new Date().getFullYear()} Ansidesk. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
