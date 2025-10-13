import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Aceptación de los Términos",
      content: "Al acceder y utilizar Sedefy, aceptas estar sujeto a estos términos y condiciones de uso. Si no estás de acuerdo con alguno de estos términos, no debes utilizar la plataforma.",
    },
    {
      title: "2. Uso de la Plataforma",
      content: "Sedefy es una plataforma educativa diseñada para compartir y consumir contenido educativo. Te comprometes a utilizar la plataforma de manera responsable y conforme a las leyes aplicables. No está permitido el uso de la plataforma para actividades ilegales, compartir contenido inapropiado, acosar a otros usuarios o cualquier actividad que viole los derechos de terceros.",
    },
    {
      title: "3. Cuentas de Usuario",
      content: "Para utilizar ciertas funciones de Sedefy, debes crear una cuenta. Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. Debes notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta. Sedefy no será responsable de ninguna pérdida o daño derivado de tu incumplimiento de esta obligación.",
    },
    {
      title: "4. Contenido del Usuario",
      content: "Los usuarios pueden publicar, subir o compartir contenido en Sedefy. Al hacerlo, garantizas que tienes los derechos necesarios sobre el contenido y que no infringe los derechos de terceros. Sedefy se reserva el derecho de eliminar cualquier contenido que viole estos términos o las políticas de la plataforma. Al publicar contenido, otorgas a Sedefy una licencia no exclusiva, mundial y libre de regalías para usar, reproducir, modificar y distribuir tu contenido en la plataforma.",
    },
    {
      title: "5. Propiedad Intelectual",
      content: "Todo el contenido, diseño, gráficos, código y otros materiales de Sedefy son propiedad de Sedefy o sus licenciantes y están protegidos por las leyes de propiedad intelectual. No puedes copiar, modificar, distribuir o reproducir ningún contenido de la plataforma sin autorización previa por escrito.",
    },
    {
      title: "6. Conducta Prohibida",
      content: "Está estrictamente prohibido: usar la plataforma para cualquier propósito ilegal o no autorizado; intentar obtener acceso no autorizado a la plataforma o a sistemas relacionados; interferir con el funcionamiento de la plataforma; acosar, intimidar o amenazar a otros usuarios; publicar contenido ofensivo, difamatorio, discriminatorio o pornográfico.",
    },
    {
      title: "7. Modificaciones del Servicio",
      content: "Sedefy se reserva el derecho de modificar, suspender o discontinuar la plataforma en cualquier momento sin previo aviso. No seremos responsables ante ti o ante terceros por cualquier modificación, suspensión o discontinuación de la plataforma.",
    },
    {
      title: "8. Limitación de Responsabilidad",
      content: "Sedefy se proporciona 'tal cual' sin garantías de ningún tipo. No garantizamos que la plataforma esté libre de errores o que funcione sin interrupciones. En ningún caso Sedefy será responsable de daños directos, indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de usar la plataforma.",
    },
    {
      title: "9. Indemnización",
      content: "Aceptas indemnizar y mantener indemne a Sedefy, sus directores, empleados y agentes de cualquier reclamo, pérdida, responsabilidad, daño o gasto (incluidos honorarios de abogados) que surjan de tu uso de la plataforma o tu violación de estos términos.",
    },
    {
      title: "10. Ley Aplicable",
      content: "Estos términos se regirán e interpretarán de acuerdo con las leyes aplicables, sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa relacionada con estos términos se resolverá en los tribunales competentes.",
    },
    {
      title: "11. Modificaciones de los Términos",
      content: "Sedefy se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la plataforma. Es tu responsabilidad revisar periódicamente estos términos. El uso continuado de la plataforma después de la publicación de cambios constituye tu aceptación de dichos cambios.",
    },
    {
      title: "12. Contacto",
      content: "Si tienes preguntas sobre estos términos, puedes contactarnos a través de la plataforma o enviando un correo electrónico a legal@sedefy.com.",
    },
  ];

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Title */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
              <FileText className="w-4 h-4" />
              Legal
            </div>
            <h1 className="text-4xl font-bold">Términos y Condiciones</h1>
            <p className="text-muted-foreground">
              Última actualización: Enero 2025
            </p>
          </div>

          {/* Content */}
          <Card>
            <CardContent className="p-8 space-y-8">
              <p className="text-muted-foreground">
                Bienvenido a Sedefy. Al utilizar nuestra plataforma, aceptas cumplir con los siguientes términos y condiciones. Por favor, léelos cuidadosamente.
              </p>

              {sections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <h2 className="text-xl font-bold">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}

              <div className="pt-6 border-t">
                <p className="text-sm text-muted-foreground italic">
                  Al continuar utilizando Sedefy, confirmas que has leído, entendido y aceptado estos términos y condiciones.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default TermsAndConditions;
