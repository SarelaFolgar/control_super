// Variables globales
let productosExistentes = [];
let supermercadosExistentes = [];
let contadorProductos = 1;

// Cargar datos existentes al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosExistentes();
    configurarFecha();
    configurarEventos();
    cargarSupermercados();
});

// Cargar productos y supermercados del JSON
async function cargarDatosExistentes() {
    try {
        const response = await fetch('datos_super.json');
        const datos = await response.json();
        
        // Extraer productos únicos
        productosExistentes = [...new Set(datos.map(item => item.producto))].sort();
        
        console.log(`✅ ${productosExistentes.length} productos cargados para sugerencias`);
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarMensaje('Error cargando datos existentes', 'error');
    }
}

// Cargar supermercados existentes
async function cargarSupermercados() {
    try {
        const response = await fetch('datos_super.json');
        const datos = await response.json();
        
        // Extraer supermercados únicos
        supermercadosExistentes = [...new Set(datos.map(item => item.super))].sort();
        
        const select = document.getElementById('supermercado');
        
        // Limpiar opciones excepto la primera
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Añadir supermercados existentes
        supermercadosExistentes.forEach(supermercado => {
            const option = document.createElement('option');
            option.value = supermercado;
            option.textContent = supermercado;
            select.appendChild(option);
        });
        
        // Añadir opción "Otro"
        const optionOtro = document.createElement('option');
        optionOtro.value = 'otro';
        optionOtro.textContent = 'Otro...';
        select.appendChild(optionOtro);
        
    } catch (error) {
        console.error('Error cargando supermercados:', error);
    }
}

// Configurar fecha por defecto (hoy)
function configurarFecha() {
    const hoy = new Date();
    const fechaInput = document.getElementById('fecha');
    
    // Formato YYYY-MM-DD para input type="date"
    const fechaFormateada = hoy.toISOString().split('T')[0];
    fechaInput.value = fechaFormateada;
}

// Configurar eventos
function configurarEventos() {
    // Supermercado: mostrar/ocultar campo "Otro"
    const selectSuper = document.getElementById('supermercado');
    const inputNuevoSuper = document.getElementById('nuevo-super');
    
    selectSuper.addEventListener('change', function() {
        if (this.value === 'otro') {
            inputNuevoSuper.style.display = 'block';
            inputNuevoSuper.focus();
        } else {
            inputNuevoSuper.style.display = 'none';
            inputNuevoSuper.value = '';
        }
    });
    
    // Sugerencias de productos
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('producto-input')) {
            mostrarSugerencias(e.target);
        }
        
        // Calcular precio por kg/unidad
        if (e.target.id.includes('cantidad-') || e.target.id.includes('precio-') || 
            e.target.id.includes('unidad-')) {
            calcularPrecioUnitario(e.target);
        }
    });
    
    // Enviar formulario
    document.getElementById('compra-form').addEventListener('submit', function(e) {
        e.preventDefault();
        enviarCompra();
    });
}

// Mostrar sugerencias de productos
function mostrarSugerencias(input) {
    const valor = input.value.toLowerCase().trim();
    const sugerenciasId = `sugerencias-${input.id.split('-')[1]}`;
    const sugerenciasDiv = document.getElementById(sugerenciasId);
    
    if (!sugerenciasDiv) return;
    
    sugerenciasDiv.innerHTML = '';
    
    if (valor.length < 2) {
        sugerenciasDiv.style.display = 'none';
        return;
    }
    
    const matches = productosExistentes
        .filter(producto => producto.toLowerCase().includes(valor))
        .slice(0, 5);
    
    if (matches.length === 0) {
        sugerenciasDiv.style.display = 'none';
        return;
    }
    
    matches.forEach(producto => {
        const div = document.createElement('div');
        div.className = 'sugerencia-item';
        div.textContent = producto;
        div.addEventListener('click', function() {
            input.value = producto;
            sugerenciasDiv.innerHTML = '';
            sugerenciasDiv.style.display = 'none';
        });
        sugerenciasDiv.appendChild(div);
    });
    
    sugerenciasDiv.style.display = 'block';
}

// Calcular precio por kg o unidad
function calcularPrecioUnitario(elemento) {
    const idNum = elemento.id.split('-')[1];
    const cantidad = parseFloat(document.getElementById(`cantidad-${idNum}`).value) || 0;
    const precio = parseFloat(document.getElementById(`precio-${idNum}`).value) || 0;
    const unidad = document.getElementById(`unidad-${idNum}`).value;
    const precioCalcDiv = document.getElementById(`precio-calc-${idNum}`);
    
    if (!precioCalcDiv || cantidad <= 0 || precio <= 0) {
        if (precioCalcDiv) {
            precioCalcDiv.querySelector('span').textContent = '-';
        }
        return;
    }
    
    let calculado = 0;
    let texto = '';
    
    if (unidad === 'g') {
        calculado = (precio / cantidad) * 1000;
        texto = `${calculado.toFixed(2)}€/kg`;
    } else if (unidad === 'ud') {
        calculado = precio / cantidad;
        texto = `${calculado.toFixed(2)}€/ud`;
    }
    
    precioCalcDiv.querySelector('span').textContent = texto;
}

// Agregar nuevo campo de producto
function agregarProducto() {
    contadorProductos++;
    const container = document.getElementById('productos-container');
    
    const nuevoProducto = document.createElement('div');
    nuevoProducto.className = 'producto-item';
    nuevoProducto.innerHTML = `
        <h3>Producto ${contadorProductos}</h3>
        
        <div class="form-group">
            <label for="producto-${contadorProductos}">Producto:</label>
            <input type="text" id="producto-${contadorProductos}" class="producto-input" 
                   placeholder="Ej: lomo adobado, pan, arroz...">
            <div class="sugerencias" id="sugerencias-${contadorProductos}"></div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="cantidad-${contadorProductos}">Cantidad:</label>
                <input type="number" id="cantidad-${contadorProductos}" step="0.01" placeholder="Ej: 1000">
            </div>
            <div class="form-group">
                <label for="unidad-${contadorProductos}">Unidad:</label>
                <select id="unidad-${contadorProductos}">
                    <option value="g">g (gramos)</option>
                    <option value="ud">ud (unidades)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="marca-${contadorProductos}">Marca:</label>
                <input type="text" id="marca-${contadorProductos}" placeholder="Ej: no aplica">
            </div>
            <div class="form-group">
                <label for="precio-${contadorProductos}">Precio (€):</label>
                <input type="number" id="precio-${contadorProductos}" step="0.01" placeholder="Ej: 2.81">
            </div>
        </div>
        
        <div class="precio-calculado" id="precio-calc-${contadorProductos}">
            <small>Precio por 1kg/unidad: <span>-</span></small>
        </div>
        
        <button type="button" class="btn-eliminar" onclick="eliminarProducto(this)">
            <i class="fas fa-trash"></i> Eliminar
        </button>
    `;
    
    container.appendChild(nuevoProducto);
}

// Eliminar producto
function eliminarProducto(boton) {
    if (contadorProductos <= 1) {
        mostrarMensaje('Debe haber al menos un producto', 'error');
        return;
    }
    
    const productoItem = boton.closest('.producto-item');
    productoItem.remove();
    contadorProductos--;
    
    // Renumerar productos
    const productos = document.querySelectorAll('.producto-item');
    productos.forEach((item, index) => {
        item.querySelector('h3').textContent = `Producto ${index + 1}`;
    });
}

// Validar datos
// Modifica la función validarDatos para usar el formato correcto:
function validarDatos() {
    const fecha = document.getElementById('fecha').value;
    const supermercadoSelect = document.getElementById('supermercado');
    const supermercado = supermercadoSelect.value === 'otro' 
        ? document.getElementById('nuevo-super').value.trim()
        : supermercadoSelect.value;
    
    // Validar campos básicos
    if (!fecha) {
        mostrarMensaje('Debe seleccionar una fecha', 'error');
        return false;
    }
    
    if (!supermercado) {
        mostrarMensaje('Debe seleccionar o escribir un supermercado', 'error');
        return false;
    }
    
    // Validar productos
    const productosValidos = [];
    
    for (let i = 1; i <= contadorProductos; i++) {
        const producto = document.getElementById(`producto-${i}`).value.trim();
        const cantidad = parseFloat(document.getElementById(`cantidad-${i}`).value);
        const precio = parseFloat(document.getElementById(`precio-${i}`).value);
        const marca = document.getElementById(`marca-${i}`).value.trim() || 'no aplica';
        
        if (!producto || isNaN(cantidad) || cantidad <= 0 || isNaN(precio) || precio <= 0) {
            mostrarMensaje(`Producto ${i}: Complete todos los campos correctamente`, 'error');
            return false;
        }
        
        productosValidos.push({
            fecha: formatearFechaParaJSON(fecha), // Usar formato correcto
            super: supermercado.toLowerCase(),
            producto: producto.toLowerCase(),
            cantidad: cantidad,
            unidad: document.getElementById(`unidad-${i}`).value,
            marca: marca.toLowerCase(),
            precio: precio
        });
    }
    
    return productosValidos;
}

// Enviar compra a la API
async function enviarCompra() {
    const productos = validarDatos();
    if (!productos) return;
    
    mostrarMensaje('Enviando datos...', 'info');
    
    try {
        // URL de tu API en Render
        const API_URL = 'https://control-super-api.onrender.com/api/agregar-compra';
        
        // Enviar datos a la API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productos: productos
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        mostrarMensaje(`✅ ${data.message}`, 'success');
        
        // Limpiar formulario después de 3 segundos
        setTimeout(() => {
            document.getElementById('compra-form').reset();
            configurarFecha();
            // Mantener solo un producto
            const productosContainer = document.getElementById('productos-container');
            while (productosContainer.children.length > 1) {
                productosContainer.lastChild.remove();
            }
            contadorProductos = 1;
        }, 3000);
        
    } catch (error) {
        console.error('Error enviando compra:', error);
        mostrarMensaje('Error al enviar la compra: ' + error.message, 'error');
    }
}

// Mostrar mensajes
function mostrarMensaje(texto, tipo = 'info') {
    const mensajeDiv = document.getElementById('mensaje');
    
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    
    // Auto-ocultar después de 5 segundos
    if (tipo !== 'error') {
        setTimeout(() => {
            mensajeDiv.textContent = '';
            mensajeDiv.className = 'mensaje';
        }, 5000);
    }
}

// Formatear fecha para JSON
function formatearFechaParaJSON(fechaInput) {
    const fecha = new Date(fechaInput);
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${dia}/${mes}/${año}`;
}
