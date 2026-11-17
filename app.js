// Hojalista: catálogo y calculadoras. Sin cookies ni rastreadores.
(function () {
  'use strict';
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
  var r2 = function (x) { return Math.round((x + Number.EPSILON) * 100) / 100; };
  var set = function (id, text) { $(id).textContent = text; };

  // ── Catálogo
  var productos = [
    { t: 'Autónomos', n: 'Tarifa por hora', d: 'Cuánto cobrar por hora para ganar el sueldo que quieres, contando impuestos, gastos, vacaciones y horas no facturables.', p: 5, gratis: 'descargas/06-tarifa-por-hora.xlsx' },
    { t: 'Autónomos', n: 'Ingresos, gastos e impuestos', d: 'Apunta facturas y gastos y mira cada trimestre cuánto IVA e IRPF te toca pagar, y cuánto apartar para Hacienda.', p: 12, prueba: 'descargas/01-prueba-un-trimestre.xlsx' },
    { t: 'Autónomos', n: 'Presupuestos profesionales', d: 'Presupuesto con tus datos, líneas, descuentos, IVA y retención. Listo para guardar en PDF y enviar.', p: 7 },
    { t: 'Autónomos', n: 'Control de cobros pendientes', d: 'Apunta las facturas que envías y mira cuáles están vencidas, los días de retraso y lo que te debe cada cliente.', p: 9 },
    { t: 'Negocios', n: 'Previsión de tesorería', d: 'Doce meses de cobros y pagos con el saldo previsto y un aviso cuando la caja baja de tu mínimo.', p: 9 },
    { t: 'Negocios', n: 'Punto de equilibrio', d: 'Cuántas unidades tienes que vender al mes para cubrir gastos y cuántas para ganar lo que quieres.', p: 7 },
    { t: 'Hostelería', n: 'Escandallos de cocina', d: 'Coste real de cada plato con mermas, precio recomendado según tu objetivo y margen con el precio de tu carta.', p: 15 },
    { t: 'Equipos', n: 'Cuadrante de turnos', d: 'Cuadrante mensual para 20 personas con horas trabajadas, diferencia con contrato, vacaciones y cobertura diaria.', p: 12 },
    { t: 'Tiendas', n: 'Control de stock', d: 'Entradas, salidas y stock al día, con aviso de reposición y valor del almacén.', p: 9 },
    { t: 'Tiendas', n: 'Precios de producto', d: 'Suma materiales, tu tiempo, embalaje, envío y comisiones, y te dice a cuánto vender para ganar el margen que quieres.', p: 9 },
    { t: 'Pack', n: 'Pack Autónomo', d: 'Cinco plantillas para llevar tus cuentas: ingresos y gastos, presupuestos, tarifa por hora, tesorería y cobros pendientes.', p: 29, pack: true },
    { t: 'Pack', n: 'Pack Hostelería', d: 'Cuatro plantillas para bares y restaurantes: escandallos, cuadrante de turnos, control de stock y punto de equilibrio.', p: 29, pack: true },
  ];
  $('catalogo-grid').innerHTML = productos.map(function (x) {
    return '<article class="card rv' + (x.pack ? ' pack' : '') + (x.gratis ? ' free' : '') + (x.prueba ? ' trial' : '') + '"><span class="tag">' + x.t + '</span><h3>' + x.n + '</h3><p>' + x.d +
      '</p>' + (x.prueba ? '<a class="try link" href="' + x.prueba + '" download data-goatcounter-click="descarga-prueba-un-trimestre-catalogo" data-goatcounter-title="Descarga: Prueba de un trimestre (catálogo)">Probar gratis un trimestre (.xlsx)</a>' : '') + '<div class="foot">' + (x.gratis
        ? '<span class="price">Gratis</span><a class="btn" href="' + x.gratis + '" download data-goatcounter-click="descarga-tarifa-por-hora-catalogo" data-goatcounter-title="Descarga: Tarifa por hora (catálogo)">Descargar (.xlsx)</a>'
        : '<span class="price">' + x.p + ' €</span><span class="soon">Disponible pronto</span>') + '</div></article>';
  }).join('');

  // ── Entrada escalonada al hacer scroll (sin JS o con «reducir movimiento», todo se ve desde el principio)
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('anim');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  }

  // ── Pestañas
  var tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (o) {
        var on = o === b;
        o.setAttribute('aria-selected', on);
        $(o.dataset.calc).classList.toggle('on', on);
      });
    });
  });

  // ── 1. Cuota de autónomos 2026 (tabla prorrogada de 2025; tipo 31,5 % con MEI)
  // [rendimiento neto mensual hasta, base mínima, cuota mínima]
  var TRAMOS = [
    [670, 653.59, 205.88], [900, 718.95, 226.47], [1166.70, 849.67, 267.65], [1300, 950.98, 299.56],
    [1500, 960.78, 302.65], [1700, 960.78, 302.65], [1850, 1143.79, 360.29], [2030, 1209.15, 380.88],
    [2330, 1274.51, 401.47], [2760, 1356.21, 427.21], [3190, 1437.91, 452.94], [3620, 1519.61, 478.68],
    [4050, 1601.31, 504.41], [6000, 1732.03, 545.59], [Infinity, 1928.10, 607.35],
  ];
  var TARIFA_PLANA = 88.64;
  function cuota() {
    var bruto = num('c-ing') - num('c-gas');
    var neto = Math.max(0, bruto) * (1 - num('c-ded') / 100);
    var i = 0;
    while (neto > TRAMOS[i][0]) i++;
    var t = TRAMOS[i], plana = $('c-plana').checked;
    var c = plana ? TARIFA_PLANA : t[2];
    set('c-cuota', eur.format(c));
    set('c-neto', eur.format(r2(neto)));
    set('c-tramo', (i + 1) + ' de 15');
    set('c-base', eur.format(t[1]));
    set('c-anual', eur.format(r2(c * 12)));
    set('c-queda', eur.format(r2(bruto - c)));
    set('c-nota', plana
      ? 'Tarifa plana: 80 € más el MEI durante los 12 primeros meses. Sin ella pagarías ' + eur.format(t[2]) + ' al mes.'
      : 'Cuota mínima de tu tramo. Puedes elegir una base más alta para cotizar más.');
  }

  // ── 2. IVA e IRPF de una factura
  function factura() {
    var iva = num('f-iva') / 100, irpf = num('f-irpf') / 100, imp = num('f-imp');
    var base = $('f-modo').value === 'base' ? imp : imp / (1 + iva - irpf);
    base = r2(base);
    var cIva = r2(base * iva), cIrpf = r2(base * irpf);
    set('f-total', eur.format(r2(base + cIva - cIrpf)));
    set('f-base', eur.format(base));
    set('f-civa', eur.format(cIva));
    set('f-cirpf', '− ' + eur.format(cIrpf));
    set('f-lbl', $('f-modo').value === 'base' ? 'Base imponible (sin IVA)' : 'Total que quieres cobrar');
  }

  // ── 3. Precio por hora (misma lógica que la plantilla «Tarifa por hora»)
  function hora() {
    var anual = num('h-sueldo') * 12;
    var antes = r2(anual / (1 - Math.min(num('h-irpf'), 95) / 100));
    var objetivo = r2((antes + num('h-gastos') * 12) * (1 + num('h-margen') / 100));
    var dias = (52 - num('h-vac')) * num('h-dias') - num('h-fest');
    var horas = Math.round(dias * num('h-horas') * num('h-fact') / 100);
    var tarifa = horas > 0 ? r2(objetivo / horas) : 0;
    set('h-tarifa', eur.format(tarifa));
    set('h-objetivo', eur.format(objetivo));
    set('h-mes', eur.format(r2(objetivo / 12)));
    set('h-diasr', String(Math.max(0, dias)));
    set('h-horasr', String(Math.max(0, horas)));
    set('h-jornada', eur.format(r2(tarifa * num('h-horas'))));
  }

  [['calc-cuota', cuota], ['calc-factura', factura], ['calc-hora', hora]].forEach(function (p) {
    $(p[0]).addEventListener('input', p[1]);
    $(p[0]).addEventListener('change', p[1]);
    p[1]();
  });
})();

// ── Fondo: vidrio estriado verde que fluye y reacciona al puntero (WebGL propio, sin librerías).
// Sin WebGL se queda el degradado de CSS; con «reducir movimiento» se pinta un solo fotograma.
(function () {
  'use strict';
  var cv = document.getElementById('fondo');
  if (!cv) return;
  var gl;
  try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
  if (!gl) return;

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 R;uniform vec2 M;uniform float T;uniform float W;uniform float D;uniform float S;',
    'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float a=.5,s=0.;for(int k=0;k<3;k++){s+=a*n(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s/.875;}',
    'void main(){',
    ' vec2 px=gl_FragCoord.xy;',
    ' float s=px.x/W,id=floor(s),f=fract(s);',
    // cada estría actúa como una lente: estira lo que hay detrás y crea el corte entre tiras
    ' vec2 p=vec2((id+.5+(f-.5)*2.8)*W,px.y)/R.y;',
    ' vec2 dm=p-M/R.y;',
    ' float g=exp(-dot(dm,dm)*4.5)*S;',
    ' vec2 q=p*vec2(.9,.62)-dm*g*.3;',
    ' float t=T*.055;',
    ' vec2 w=vec2(fbm(q*1.5+vec2(0.,t*1.3)),fbm(q*1.5+vec2(5.2,-t)));',
    ' float v=fbm(q*1.05+w*1.8+vec2(t*.6,t*.25)+g*.7);',
    ' v=smoothstep(.14,.78,v)+g*.3;',
    ' vec3 c=mix(vec3(.014,.055,.04),vec3(.03,.2,.135),smoothstep(.08,.5,v));',
    ' c=mix(c,vec3(.09,.47,.31),smoothstep(.45,.98,v));',
    ' c+=vec3(.2,.42,.3)*pow(max(v-.8,0.),2.);',
    ' float edge=smoothstep(0.,.07,f)*smoothstep(1.,.93,f);',
    ' c*=(.76+.24*sin(f*3.14159))*(.7+.3*edge);',
    ' c+=vec3(.03,.06,.045)*smoothstep(.88,.97,f)*v;',
    ' c=mix(vec3(.024,.078,.059),c,D);',
    ' c+=(h(px)-.5)*.022;',
    ' gl_FragColor=vec4(c,1.);}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['R', 'M', 'T', 'W', 'D', 'S'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ratio = 1, w = 0, h = 0;
  var mx = 0, my = 0, tx = 0, ty = 0, st = 0, stT = 0, t0 = performance.now(), raf = 0;

  function size() {
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    var nw = Math.round(cv.clientWidth * ratio), nh = Math.round(cv.clientHeight * ratio);
    if (nw === w && nh === h) return false;
    w = cv.width = nw; h = cv.height = nh; gl.viewport(0, 0, w, h);
    return true;
  }
  function draw(now) {
    size();
    mx += (tx - mx) * .07; my += (ty - my) * .07;
    stT *= .985; st += (stT - st) * .06;
    // se atenúa al bajar para que el texto de las secciones se lea bien
    var k = Math.min(1, (window.scrollY || 0) / (window.innerHeight * .9));
    k = k * k * (3 - 2 * k);
    gl.uniform2f(U.R, w, h);
    gl.uniform2f(U.M, mx * ratio, h - my * ratio);
    gl.uniform1f(U.T, still ? 40 : (now - t0) / 1000 + 40);
    gl.uniform1f(U.W, Math.max(12, Math.min(22, cv.clientWidth / 70)) * ratio);
    gl.uniform1f(U.D, 1 - .7 * k);
    gl.uniform1f(U.S, st);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }

  tx = mx = window.innerWidth * .72; ty = my = window.innerHeight * .4;
  cv.classList.add('on');
  if (still) {
    draw(t0);
    window.addEventListener('resize', function () { draw(t0); });
    return;
  }
  window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; stT = 1; }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(loop);
  });
  raf = requestAnimationFrame(loop);
})();
