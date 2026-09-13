# Afinador

Afinador cromático por micrófono para afinaciones no tradicionales. Corre en el navegador, sin instalar nada.

https://cralvearm.github.io/afinador/

## Qué hace

- Escucha por el micrófono del aparato o por una interfaz de audio, a elección.
- Mide la cuerda que el intérprete marca y muestra la desviación en cents respecto de la altura de esa cuerda, con una aguja de −50 a +50 cents. La frecuencia objetivo se pone en verde cuando la cuerda calza.
- Suena un tono de referencia de la cuerda marcada.
- Trae afinaciones precargadas y admite otras, que quedan guardadas en el navegador del aparato. "Exportar" e "Importar" las pasan de un aparato a otro.
- Las afinaciones definidas por razones sobre una fundamental se transponen desde la página con sólo cambiar la fundamental.

## Cómo se carga una afinación

En "Nueva afinación" se pone el nombre, el número de cuerdas y las alturas, de la cuerda 1 —la más aguda— a la última. Las alturas se escriben de una de tres formas.

- **Razón × fundamental.** Una fundamental en Hz y una razón por cuerda, con la octava incluida. Sobre 190 Hz, 7/16 da 83,13 Hz y 7/4 daría 332,5 Hz.
- **Hz.** La frecuencia de cada cuerda al aire.
- **Nota + cents.** Nota, octava en notación científica —la4 es 440 Hz— y desviación en cents respecto del temperamento igual.

El formulario muestra el Hz resultante de cada cuerda antes de guardar.

## Cómo se hace una página para otro instrumento

El código está en `app.js` y `app.css`, comunes a todas las páginas. Cada página es un `index.html` que carga esos dos archivos y define su lista en `window.AFINADOR`.

```js
window.AFINADOR = {
  clave: 'afinador.bajo.afinaciones', // nombre propio para lo que se guarde en el navegador
  cuerdas: 4,                          // número de cuerdas por defecto en el formulario
  pasaAltos: 30,                       // corte inferior del filtro de entrada, en Hz (60 si se omite)
  afinaciones: [                       // lista precargada; puede ir vacía
    { id: 'ejemplo', nombre: 'Ejemplo', fundamental: 110, fijo: true,
      cuerdas: [{ razon: '3/2' }, { razon: '1/1' }, { razon: '3/4' }, { razon: '1/2' }] },
  ],
};
```

Una cuerda lleva `razon` —y entonces la afinación lleva `fundamental`— o lleva `hz`. La carpeta `bajo/` es un ejemplo completo; en su `index.html` los enlaces a `app.js` y `app.css` llevan `../` porque está un nivel más abajo.

## Cómo funciona la medida

Detección de periodo por diferencia cuadrática normalizada —método de McLeod— sobre una ventana de 32768 muestras, unas diez lecturas por segundo, con interpolación parabólica del pico. Antes de medir, la señal pasa por un filtro de 60 a 1000 Hz. Se muestra una lectura sólo cuando la mayoría de las últimas coincide con su mediana; la aguja se frena al acercarse al centro y el verde entra a ±3 cents y sale a ±6.

## Licencia

MIT. Ver `LICENSE`.
