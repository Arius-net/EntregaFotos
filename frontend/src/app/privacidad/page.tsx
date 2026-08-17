import Link from 'next/link';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#05060d] text-white p-8">
      <div className="max-w-3xl mx-auto py-12">
        <Link href="/" className="text-[#8892f0] hover:underline mb-8 inline-block">&larr; Volver al inicio</Link>
        <h1 className="text-4xl font-bold mb-8">Políticas de Privacidad</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p>
            En <strong>Quevedo Contigo</strong>, respetamos tu privacidad y estamos comprometidos a proteger tus datos personales. 
            Esta política de privacidad explica cómo recopilamos, usamos y salvaguardamos tu información.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">1. Información que recopilamos</h2>
          <p>
            Recopilamos información personal (como nombre, correo electrónico y número de teléfono) cuando creas una cuenta,
            accedes a una galería o realizas una compra.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">2. Uso de la información</h2>
          <p>
            Usamos tu información para procesar tus pedidos de fotografía, enviarte actualizaciones sobre tus galerías,
            y mejorar nuestros servicios. No vendemos ni compartimos tu información con terceros no afiliados.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">3. Seguridad</h2>
          <p>
            Implementamos medidas de seguridad para proteger tus datos personales y transacciones.
            Las descargas de fotografías y pagos están protegidos con cifrado y métodos seguros (como OpenPay).
          </p>
          
          <h2 className="text-2xl font-semibold text-white">4. Uso de Cookies</h2>
          <p>
            Utilizamos cookies esenciales para mantener tu sesión activa y permitir el funcionamiento del carrito de compras de la tienda.
          </p>
          
          <h2 className="text-2xl font-semibold text-white">5. Contacto</h2>
          <p>
            Si tienes dudas sobre nuestras políticas de privacidad, contáctanos a través de nuestros canales oficiales.
          </p>
        </div>
      </div>
    </div>
  );
}
