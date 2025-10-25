import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const UserCreationApi = () => {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const endpointUrl = `${projectUrl}/functions/v1/create-user-by-document`;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">POST</Badge>
          API de Creación de Usuarios
        </CardTitle>
        <CardDescription>
          Endpoint para crear usuarios desde sistemas externos como Sedefy Académico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL del Endpoint */}
        <div>
          <h3 className="font-semibold mb-2">URL del Endpoint</h3>
          <code className="block bg-muted p-3 rounded-md text-sm break-all">
            {endpointUrl}
          </code>
        </div>

        <Separator />

        {/* Descripción */}
        <div>
          <h3 className="font-semibold mb-2">Descripción</h3>
          <p className="text-sm text-muted-foreground">
            Este endpoint permite crear usuarios en Sedetok desde sistemas externos. 
            El usuario se crea automáticamente con su número de documento como contraseña 
            y puede ser vinculado automáticamente a una institución.
          </p>
        </div>

        <Separator />

        {/* Características */}
        <div>
          <h3 className="font-semibold mb-2">Características Principales</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Creación automática de usuario con autenticación</li>
            <li>Contraseña predeterminada: número de documento</li>
            <li>Email generado automáticamente si no se proporciona</li>
            <li>Vinculación automática a institución por NIT (opcional)</li>
            <li>Asignación de rol institucional (opcional)</li>
            <li>Detección de usuarios duplicados por número de documento</li>
          </ul>
        </div>

        <Separator />

        {/* Campos del Request */}
        <div>
          <h3 className="font-semibold mb-2">Campos del Request Body</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Campos Requeridos:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>tipo_documento</strong> (string): Tipo de documento (CC, TI, etc.)</li>
                <li><strong>numero_documento</strong> (string): Número de documento único</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Campos Opcionales:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>email</strong> (string): Email del usuario. Si no se proporciona, se genera automáticamente como numero_documento@sedefy.com</li>
                <li><strong>full_name</strong> (string): Nombre completo del usuario</li>
                <li><strong>username</strong> (string): Nombre de usuario. Si no se proporciona, se usa el número de documento</li>
                <li><strong>nit_institucion</strong> (string): NIT de la institución para vincular automáticamente</li>
                <li><strong>member_role</strong> (string): Rol en la institución. Valores válidos: 'student', 'teacher', 'parent', 'admin'. Por defecto: 'student'</li>
              </ul>
            </div>
          </div>
        </div>

        <Separator />

        {/* Respuestas */}
        <div>
          <h3 className="font-semibold mb-2">Respuestas del API</h3>
          
          <div className="space-y-4">
            <div>
              <Badge className="mb-2">201 Created</Badge>
              <p className="text-sm text-muted-foreground mb-2">Usuario creado exitosamente</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "1234567890@sedefy.com",
    "numero_documento": "1234567890",
    "tipo_documento": "CC",
    "message": "Usuario creado exitosamente. Contraseña: número de documento"
  }
}`}
              </pre>
            </div>

            <div>
              <Badge variant="destructive" className="mb-2">400 Bad Request</Badge>
              <p className="text-sm text-muted-foreground mb-2">Datos inválidos o faltantes</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "error": "tipo_documento y numero_documento son requeridos"
}`}
              </pre>
            </div>

            <div>
              <Badge variant="destructive" className="mb-2">409 Conflict</Badge>
              <p className="text-sm text-muted-foreground mb-2">Usuario ya existe</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "error": "Ya existe un usuario con ese número de documento"
}`}
              </pre>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ejemplos de Uso */}
        <div>
          <h3 className="font-semibold mb-2">Ejemplos de Uso</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Ejemplo 1: Usuario básico sin institución</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`curl -X POST '${endpointUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "email": "estudiante@email.com",
    "full_name": "Juan Pérez",
    "username": "jperez"
  }'`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Ejemplo 2: Usuario vinculado a institución</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`curl -X POST '${endpointUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "tipo_documento": "CC",
    "numero_documento": "9876543210",
    "full_name": "María García",
    "nit_institucion": "900123456",
    "member_role": "student"
  }'`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Ejemplo 3: Registro masivo (hasta 3000 usuarios)</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`curl -X POST '${projectUrl}/functions/v1/create-users-bulk' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "users": [
      {
        "tipo_documento": "CC",
        "numero_documento": "1234567890",
        "email": "usuario1@ejemplo.com",
        "full_name": "Juan Pérez",
        "nit_institucion": "900123456",
        "member_role": "student"
      },
      {
        "tipo_documento": "TI",
        "numero_documento": "9876543210",
        "full_name": "María García",
        "nit_institucion": "900123456",
        "member_role": "student"
      }
    ]
  }'`}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Límite: máximo 3000 usuarios por solicitud. Los campos opcionales son los mismos que en creación individual.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">JavaScript/TypeScript</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`const response = await fetch('${endpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tipo_documento: 'CC',
    numero_documento: '1234567890',
    full_name: 'Juan Pérez',
    email: 'estudiante@email.com',
    nit_institucion: '900123456',
    member_role: 'student'
  })
});

const data = await response.json();
console.log(data);`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Python</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`import requests

url = '${endpointUrl}'
payload = {
    'tipo_documento': 'CC',
    'numero_documento': '1234567890',
    'full_name': 'Juan Pérez',
    'email': 'estudiante@email.com',
    'nit_institucion': '900123456',
    'member_role': 'student'
}

response = requests.post(url, json=payload)
print(response.json())`}
              </pre>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notas Importantes */}
        <div>
          <h3 className="font-semibold mb-2">Notas Importantes</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><strong>Contraseña automática:</strong> La contraseña inicial siempre será el número de documento del usuario</li>
            <li><strong>Email automático:</strong> Si no se proporciona email, se genera como: numero_documento@sedefy.com</li>
            <li><strong>Vinculación institucional:</strong> Si se proporciona un NIT válido, el usuario se vincula automáticamente a la institución</li>
            <li><strong>Roles válidos:</strong> Los roles institucionales válidos son: student, teacher, parent, admin</li>
            <li><strong>Duplicados:</strong> El sistema detecta usuarios duplicados por número de documento</li>
            <li><strong>Confirmación automática:</strong> Los usuarios se crean con email confirmado automáticamente</li>
            <li><strong>Errores parciales:</strong> Si falla la vinculación institucional, el usuario se crea de todas formas</li>
          </ul>
        </div>

        <Separator />

        {/* Integración Automática */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
            🔄 Integración Automática con Institución
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Cuando se proporciona el campo <code>nit_institucion</code>, el sistema:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200 mt-2 ml-4">
            <li>Busca la institución por NIT</li>
            <li>Crea el usuario en el sistema</li>
            <li>Vincula automáticamente al usuario con la institución</li>
            <li>Asigna el rol especificado en <code>member_role</code></li>
            <li>Si no se especifica rol, asigna 'student' por defecto</li>
          </ol>
        </div>

        <Separator />

        {/* Soporte */}
        <div>
          <h3 className="font-semibold mb-2">Soporte</h3>
          <p className="text-sm text-muted-foreground">
            Para asistencia técnica o preguntas sobre la integración, contacte al equipo de soporte de Sedetok.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};