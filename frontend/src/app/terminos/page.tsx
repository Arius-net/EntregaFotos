import Link from 'next/link';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#05060d] text-white p-8">
      <div className="max-w-3xl mx-auto py-12">
        <Link href="/" className="text-[#8892f0] hover:underline mb-8 inline-block">&larr; Volver al inicio</Link>
        <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p>
            Al acceder y utilizar los servicios de <strong>Quevedo Contigo</strong>, aceptas los siguientes términos y condiciones.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">1. Propiedad Intelectual</h2>
          <p>
            Todas las fotografías y contenidos mostrados en esta plataforma son propiedad de Quevedo Contigo o de sus respectivos dueños.
            Queda prohibida su reproducción, distribución, o uso comercial sin autorización expresa y por escrito.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">2. Galerías de Clientes</h2>
          <p>
            El acceso a las galerías privadas es exclusivo para el cliente titular y aquellos con quienes comparta el código de acceso.
            Las galerías tienen un tiempo de expiración y un límite de acceso de usuarios establecidos al momento de su creación.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">3. Tienda y Pagos</h2>
          <p>
            Las compras realizadas en nuestra tienda o compras de fotografías adicionales son finales.
            No se ofrecen reembolsos por productos digitales una vez que han sido descargados, a menos que el archivo presente algún defecto.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">4. Restricciones Técnicas</h2>
          <p>
            Está prohibido intentar vulnerar la seguridad de la plataforma, utilizar software de descarga automatizada (crawlers) o evadir los límites
            de descargas gratuitas asignados a tu cuenta.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">5. Modificaciones</h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Se te notificará sobre cambios importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
