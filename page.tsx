import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ImageCarousel } from "@/components/image-carousel"


const carouselImages = [
  {
    src: "/images/img1.PNG",
    alt: "Vista general del dashboard de Ansidesk",
  },
  {
    src: "/images/img2.PNG",
    alt: "Interfaz de gestión de máquinas virtuales",
  },
  {
    src: "/images/img3.PNG",
    alt: "Gráficos de monitoreo de rendimiento",
  },
  {
    src: "/images/img4.png",
    alt: "Panel de asignación de recursos",
  },
]

export default function Home() {
  return (
    <>
      <section id="home" className="py-20 w-full">
        <div className="container mx-auto px-4 max-w-full lg:max-w-7xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Gestión de máquinas virtuales </h1>
              <p className="text-lg mb-8">
                Cree, gestione e implemente máquinas virtuales con facilidad. Nuestra plataforma ofrece una experiencia perfecta para todas sus necesidades de virtualización. Además, monitorizamos las máquinas virtuales para mantener un control sobre su rendimiento general.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/login">Empezar</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  <a href="#contact">Contáctanos</a>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <ImageCarousel images={carouselImages} autoplaySpeed={4000} className="shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 bg-gray-50 dark:bg-gray-900 w-full">
        <div className="container mx-auto px-4 max-w-full lg:max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Sobre Nosotros</h2>
            <div className="w-20 h-1 bg-primary mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Nuestro objetivo</h3>
              <p>
                Nuestro objetivo es proporcionar soluciones tecnológicas eficientes y seguras en la gestión de máquinas virtuales y servicios gestionados, optimizando la infraestructura digital de nuestros clientes. Nos comprometemos a ofrecer un servicio personalizado que se adapte a las necesidades específicas de cada negocio, garantizando alto rendimiento, disponibilidad y escalabilidad.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Nuestro equipo</h3>
              <p>
                Nuestro equipo está compuesto por tres técnicos altamente capacitados en Administración de Sistemas Informáticos en Red (ASIX), quienes se dedican a ofrecer soluciones personalizadas y eficientes en la gestión de máquinas virtuales y servicios gestionados. Con amplia experiencia y un enfoque colaborativo, trabajamos en conjunto para asegurar que cada cliente reciba el mejor soporte técnico, siempre adaptado a sus necesidades. 
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Nuestros valores</h3>
              <p>
                En Ansidesk, nos enfocamos en la innovación constante, ofreciendo soluciones avanzadas y seguras, mientras garantizamos calidad y flexibilidad en cada servicio. Valoramos la atención al cliente, brindando soporte 24/7, y promovemos una comunicación abierta y transparente en todo momento. Trabajamos como un equipo unido con nuestros clientes para cumplir sus objetivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 w-full">
        <div className="container mx-auto px-4 max-w-full lg:max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Contáctanos</h2>
            <div className="w-20 h-1 bg-primary mx-auto"></div>
          </div>

          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block mb-2 text-sm font-medium">
                    Nombre
                  </label>
                  <input id="name" name="name" className="w-full p-3 border rounded-md" required />
                </div>
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium">
                    Correo electrónico
                  </label>
                  <input id="email" name="email" type="email" className="w-full p-3 border rounded-md" required />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block mb-2 text-sm font-medium">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  className="w-full p-3 border rounded-md"
                  required
                ></textarea>
              </div>

              <Button type="submit" size="lg" className="w-full md:w-auto">
                Enviar
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

