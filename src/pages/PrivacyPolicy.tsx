import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Información que Recopilamos",
      content: "Recopilamos diferentes tipos de información cuando utilizas Sedefy: Información de cuenta (nombre, correo electrónico, contraseña cifrada), información de perfil (foto, institución, biografía), contenido que publicas (videos, documentos, comentarios), datos de uso (páginas visitadas, interacciones, tiempo de uso), información técnica (dirección IP, tipo de dispositivo, navegador).",
    },
    {
      title: "2. Cómo Utilizamos tu Información",
      content: "Utilizamos la información recopilada para: proporcionar y mantener nuestros servicios; personalizar tu experiencia en la plataforma; mejorar nuestros servicios y desarrollar nuevas funcionalidades; comunicarnos contigo sobre actualizaciones y cambios; detectar, prevenir y abordar problemas técnicos y de seguridad; analizar cómo se utiliza la plataforma; enviar notificaciones relacionadas con tu actividad.",
    },
    {
      title: "3. Compartir Información",
      content: "No vendemos tu información personal a terceros. Podemos compartir tu información en las siguientes circunstancias: con otros usuarios cuando publicas contenido públicamente; con proveedores de servicios que nos ayudan a operar la plataforma; cuando sea requerido por ley o para proteger nuestros derechos; en caso de fusión, adquisición o venta de activos, con previo aviso.",
    },
    {
      title: "4. Seguridad de los Datos",
      content: "Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal. Esto incluye: cifrado de datos sensibles; controles de acceso estrictos; monitoreo continuo de seguridad; auditorías de seguridad regulares. Sin embargo, ningún método de transmisión por Internet es 100% seguro, por lo que no podemos garantizar la seguridad absoluta.",
    },
    {
      title: "5. Tus Derechos",
      content: "Tienes derecho a: acceder a tu información personal; corregir información inexacta; solicitar la eliminación de tu información; exportar tus datos; oponerte al procesamiento de tus datos; retirar el consentimiento en cualquier momento. Para ejercer estos derechos, contáctanos a través de privacy@sedefy.com.",
    },
    {
      title: "6. Cookies y Tecnologías Similares",
      content: "Utilizamos cookies y tecnologías similares para: recordar tus preferencias; entender cómo usas la plataforma; mejorar el rendimiento del sitio; proporcionar funcionalidades de seguridad. Puedes controlar las cookies a través de la configuración de tu navegador.",
    },
    {
      title: "7. Retención de Datos",
      content: "Conservamos tu información personal mientras tu cuenta esté activa o según sea necesario para proporcionarte servicios. Si eliminas tu cuenta, conservaremos cierta información según lo requiera la ley o para propósitos legítimos del negocio, como prevención de fraude o seguridad.",
    },
    {
      title: "8. Privacidad de Menores",
      content: "Sedefy es una plataforma educativa adecuada para usuarios de todas las edades. Sin embargo, los usuarios menores de 18 años deben contar con el consentimiento de sus padres o tutores para crear una cuenta y utilizar la plataforma. No recopilamos intencionalmente información de menores de 13 años sin el consentimiento parental.",
    },
    {
      title: "9. Transferencias Internacionales",
      content: "Tu información puede ser transferida y almacenada en servidores ubicados fuera de tu país de residencia. Al usar Sedefy, consientes estas transferencias. Nos aseguramos de que cualquier transferencia cumpla con las leyes de protección de datos aplicables.",
    },
    {
      title: "10. Cambios a esta Política",
      content: "Podemos actualizar esta política de privacidad periódicamente. Te notificaremos de cualquier cambio significativo publicando la nueva política en esta página y actualizando la fecha de 'última actualización'. Te recomendamos revisar esta política periódicamente.",
    },
    {
      title: "11. Contacto",
      content: "Si tienes preguntas sobre esta política de privacidad o sobre cómo manejamos tu información personal, puedes contactarnos en: Email: privacy@sedefy.com. Nos comprometemos a responder tu consulta dentro de 48 horas.",
    },
  ];

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
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
              <Shield className="w-4 h-4" />
              Privacidad
            </div>
            <h1 className="text-4xl font-bold">Política de Privacidad</h1>
            <p className="text-muted-foreground">
              Última actualización: Enero 2025
            </p>
          </div>

          {/* Content */}
          <Card>
            <CardContent className="p-8 space-y-8">
              <p className="text-muted-foreground">
                En Sedefy, tu privacidad es importante para nosotros. Esta política describe cómo recopilamos, usamos y protegemos tu información personal cuando utilizas nuestra plataforma.
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
                  Al utilizar Sedefy, aceptas esta política de privacidad. Si no estás de acuerdo con alguna parte de esta política, por favor no utilices nuestra plataforma.
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

export default PrivacyPolicy;
