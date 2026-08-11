import { MercadoPagoConfig, Preference } from 'mercadopago';

const mpClient = new MercadoPagoConfig({ accessToken: 'APP_USR-7320137813198552-081020-8b1a1eaabc5662de6e92971692a20294-3605074257' });

async function run() {
  const preference = new Preference(mpClient);
  try {
    const prefResponse = await preference.create({
      body: {
        items: [
          {
            id: 'fotos_extra',
            title: `Fotos Extra`,
            quantity: 1,
            unit_price: 10
          }
        ],
        back_urls: {
          success: `http://localhost:3000/success`,
          failure: `http://localhost:3000/failure`,
          pending: `http://localhost:3000/pending`
        }
      }
    });
    console.log("Success! Init point:", prefResponse.init_point);
  } catch (e: any) {
    console.error("Error creating preference:");
    if (e.message) console.error(e.message);
    console.error(e);
  }
}
run();
