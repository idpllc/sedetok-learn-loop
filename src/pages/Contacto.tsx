import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Contract() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Contrato – Sedefy</title>
        <meta name="description" content="Formulario de contrato Sedefy." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <h1 className="text-lg font-semibold">Contrato</h1>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <iframe
              src="https://pushleads.co/f/form_1766569425015_qn7ua7957hm"
              width="100%"
              height="700"
              frameBorder="0"
              title="Formulario de contrato"
              className="w-full"
            />
          </div>
        </main>
      </div>
    </>
  );
}
