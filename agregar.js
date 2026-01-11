// Variables globales
let productosExistentes = [];
let supermercadosExistentes = [];
let historialCompras = []; // Nuevo: para autocompletado inteligente
let contadorProductos = 1;

// Cargar datos existentes al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosExistentes();
    configurarFecha();
    configurarEventos();
    cargarSupermercados();
    cargarHistorialCompras(); // Nuevo: cargar historial para autocompletado
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

// NUEVO: Cargar historial completo para autocompletado
async function cargarHistorialCompras() {
    try {
        const response = await fetch('datos_super.json');
        historialCompras = await response.json();
        console.log(`📊 ${historialCompras.length} registros históricos cargados para autocompletado`);
    } catch (error) {
        console.error('Error cargando historial:', error);
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
    
    // NUEVO: Cuando cambia el supermercado, actualizar sugerencias de productos
    selectSuper.addEventListener('change', function() {
        if (this.value !== 'otro') {
            actualizarProductosPorSupermercado(this.value);
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
    
    // NUEVO: Autocompletar cuando se selecciona un producto
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('sugerencia-item')) {
            const productoSeleccionado = e.target.textContent;
            const inputProducto = e.target.parentElement.previousElementSibling;
            const idNum = inputProducto.id.split('-')[1];
            
            // Autocompletar con el último registro de ese producto
            autocompletarDesdeHistorial(idNum, productoSeleccionado);
        }
    });
    
    // NUEVO: Sugerencias de marcas cuando se empieza a escribir
    document.addEventListener('input', function(e) {
        if (e.target.id && e.target.id.startsWith('marca-')) {
            mostrarSugerenciasMarcas(e.target);
        }
    });
    
    // Enviar formulario
    document.getElementById('compra-form').addEventListener('submit', function(e) {
        e.preventDefault();
        enviarCompra();
    });
}

// NUEVO: Actualizar lista de productos según supermercado seleccionado
function actualizarProductosPorSupermercado(supermercado) {
    if (!supermercado || supermercado === 'otro') return;
    
    // Filtrar productos comprados en este supermercado
    const productosEnSuper = [...new Set(
        historialCompras
            .filter(item => item.super === supermercado)
            .map(item => item.producto)
    )].sort();
    
    // Actualizar la lista global de sugerencias
    productosExistentes = productosEnSuper;
    
    console.log(`🏪 ${productosEnSuper.length} productos disponibles en ${supermercado}`);
}

// NUEVO: Autocompletar campos basado en historial
function autocompletarDesdeHistorial(idNum, productoNombre) {
    const supermercadoSelect = document.getElementById('supermercado');
    const supermercado = supermercadoSelect.value === 'otro' 
        ? document.getElementById('nuevo-super').value.trim()
        : supermercadoSelect.value;
    
    if (!supermercado || supermercado === 'otro') {
        console.log('⚠️  Selecciona un supermercado primero');
        return;
    }
    
    // Buscar el último registro para este producto en este supermercado
    const registrosProducto = historialCompras
        .filter(item => 
            item.super === supermercado && 
            item.producto === productoNombre
        )
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Más reciente primero
    
    if (registrosProducto.length > 0) {
        const ultimoRegistro = registrosProducto[0];
        
        // Autocompletar campos
        document.getElementById(`marca-${idNum}`).value = ultimoRegistro.marca || 'no aplica';
        document.getElementById(`unidad-${idNum}`).value = ultimoRegistro.unidad || 'g';
        
        // Sugerir cantidad (mantener la que ya tenía el usuario)
        const cantidadInput = document.getElementById(`cantidad-${idNum}`);
        if (!cantidadInput.value) {
            cantidadInput.value = ultimoRegistro.cantidad || '';
        }
        
        // Sugerir precio (mantener el que ya tenía el usuario)
        const precioInput = document.getElementById(`precio-${idNum}`);
        if (!precioInput.value) {
            precioInput.value = ultimoRegistro.precio || '';
        }
        
        console.log(`✅ Autocompletado: ${productoNombre} en ${supermercado} - Marca: ${ultimoRegistro.marca}`);
        
        // Calcular precio unitario
        calcularPrecioUnitario(document.getElementById(`cantidad-${idNum}`));
        
    } else {
        console.log(`ℹ️  No hay historial para ${productoNombre} en ${supermercado}`);
    }
}

// Mostrar sugerencias de productos (MODIFICADA para incluir autocompletado)
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
    
    // Filtrar productos que coincidan
    const matches = productosExistentes
        .filter(producto => producto.toLowerCase().includes(valor))
        .slice(0, 8); // Mostrar más sugerencias
    
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
            
            // NUEVO: Autocompletar otros campos
            autocompletarDesdeHistorial(input.id.split('-')[1], producto);
        });
        sugerenciasDiv.appendChild(div);
    });
    
    sugerenciasDiv.style.display = 'block';
}

// NUEVO: Mostrar sugerencias de marcas para un producto específico
function mostrarSugerenciasMarcas(input) {
    const idNum = input.id.split('-')[1];
    const productoInput = document.getElementById(`producto-${idNum}`);
    const productoNombre = productoInput.value.trim();
    const supermercadoSelect = document.getElementById('supermercado');
    const supermercado = supermercadoSelect.value === 'otro' 
        ? document.getElementById('nuevo-super').value.trim()
        : supermercadoSelect.value;
    
    if (!productoNombre || productoNombre.length < 2 || !supermercado || supermercado === 'otro') {
        return;
    }
    
    const valorMarca = input.value.toLowerCase().trim();
    
    // Crear contenedor de sugerencias de marcas si no existe
    let sugerenciasDiv = document.getElementById(`sugerencias-marca-${idNum}`);
    if (!sugerenciasDiv) {
        sugerenciasDiv = document.createElement('div');
        sugerenciasDiv.id = `sugerencias-marca-${idNum}`;
        sugerenciasDiv.className = 'sugerencias-marca';
        input.parentNode.appendChild(sugerenciasDiv);
    }
    
    sugerenciasDiv.innerHTML = '';
    
    if (valorMarca.length < 1) {
        sugerenciasDiv.style.display = 'none';
        return;
    }
    
    // Buscar marcas usadas para este producto en este supermercado
    const marcasUsadas = [...new Set(
        historialCompras
            .filter(item => 
                item.super === supermercado && 
                item.producto === productoNombre
            )
            .map(item => item.marca)
            .filter(marca => marca && marca !== 'no aplica')
    )].sort();
    
    // Filtrar marcas que coincidan con lo que el usuario está escribiendo
    const matches = marcasUsadas
        .filter(marca => marca.toLowerCase().includes(valorMarca))
        .slice(0, 5);
    
    if (matches.length === 0) {
        sugerenciasDiv.style.display = 'none';
        return;
    }
    
    matches.forEach(marca => {
        const div = document.createElement('div');
        div.className = 'sugerencia-item-marca';
        div.textContent = marca;
        div.addEventListener('click', function() {
            input.value = marca;
            sugerenciasDiv.innerHTML = '';
            sugerenciasDiv.style.display = 'none';
            
            // NUEVO: Autocompletar con datos de esa marca específica
            autocompletarConMarcaEspecifica(idNum, productoNombre, supermercado, marca);
        });
        sugerenciasDiv.appendChild(div);
    });
    
    sugerenciasDiv.style.display = 'block';
}

// NUEVO: Autocompletar con datos de una marca específica
function autocompletarConMarcaEspecifica(idNum, productoNombre, supermercado, marcaEspecifica) {
    // Buscar el último registro para esta combinación exacta
    const registros = historialCompras
        .filter(item => 
            item.super === supermercado && 
            item.producto === productoNombre &&
            item.marca === marcaEspecifica
        )
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (registros.length > 0) {
        const ultimoRegistro = registros[0];
        
        // Autocompletar cantidad si está vacío
        const cantidadInput = document.getElementById(`cantidad-${idNum}`);
        if (!cantidadInput.value) {
            cantidadInput.value = ultimoRegistro.cantidad || '';
        }
        
        // Autocompletar unidad
        document.getElementById(`unidad-${idNum}`).value = ultimoRegistro.unidad || 'g';
        
        // Autocompletar precio si está vacío
        const precioInput = document.getElementById(`precio-${idNum}`);
        if (!precioInput.value) {
            precioInput.value = ultimoRegistro.precio || '';
        }
        
        console.log(`✅ Autocompletado con marca específica: ${marcaEspecifica}`);
        
        // Calcular precio unitario
        calcularPrecioUnitario(cantidadInput);
    }
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

// Agregar nuevo campo de producto (MODIFICADA para incluir eventos de autocompletado)
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
                <!-- Las sugerencias de marca se crean dinámicamente -->
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
    
    // NUEVO: Añadir evento para autocompletar cuando se selecciona producto
    const inputProducto = document.getElementById(`producto-${contadorProductos}`);
    inputProducto.addEventListener('blur', function() {
        if (this.value.trim()) {
            const idNum = this.id.split('-')[1];
            autocompletarDesdeHistorial(idNum, this.value.trim());
        }
    });
    
    // NUEVO: Añadir evento para sugerencias de marca
    const inputMarca = document.getElementById(`marca-${contadorProductos}`);
    inputMarca.addEventListener('focus', function() {
        mostrarSugerenciasMarcas(this);
    });
}

// Eliminar producto
function eliminarProducto(boton) {
    if (contadorProductos <= 1) {
        mostrarMensaje('Debe haber al menos un producto', 'error');
        return;
    }
    
    const productoItem = boton.closest('.producto-item');
    
    // Eliminar también las sugerencias de marca asociadas
    const idNum = boton.closest('.producto-item').querySelector('[id^="marca-"]').id.split('-')[1];
    const sugerenciasMarca = document.getElementById(`sugerencias-marca-${idNum}`);
    if (sugerenciasMarca) {
        sugerenciasMarca.remove();
    }
    
    productoItem.remove();
    contadorProductos--;
    
    // Renumerar productos
    const productos = document.querySelectorAll('.producto-item');
    productos.forEach((item, index) => {
        const newNum = index + 1;
        item.querySelector('h3').textContent = `Producto ${newNum}`;
        
        // Renumerar todos los IDs
        const inputs = item.querySelectorAll('[id]');
        inputs.forEach(input => {
            const oldId = input.id;
            const parts = oldId.split('-');
            if (parts.length > 1) {
                input.id = `${parts[0]}-${newNum}`;
            }
        });
        
        // Renumerar sugerencias
        const sugerencias = item.querySelector('.sugerencias');
        if (sugerencias) {
            sugerencias.id = `sugerencias-${newNum}`;
        }
        
        // Renumerar precio calculado
        const precioCalc = item.querySelector('.precio-calculado');
        if (precioCalc) {
            precioCalc.id = `precio-calc-${newNum}`;
        }
    });
}

// Validar datos
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
            fecha: formatearFechaParaJSON(fecha),
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

        alert('✅ Producto enviado. Revisa GitHub en 2 minutos.');
        
        mostrarMensaje(`✅ ${data.message}`, 'success');
        
        // Limpiar formulario después de 3 segundos
        setTimeout(() => {
            document.getElementById('compra-form').reset();
            configurarFecha();
            // Mantener solo un producto
            const productosContainer = document.getElementById('productos-container');
            while (productosContainer.children.length > 1) {
                // Eliminar sugerencias de marca de los productos que se eliminan
                const productoItem = productosContainer.lastChild;
                const idNum = productoItem.querySelector('[id^="marca-"]').id.split('-')[1];
                const sugerenciasMarca = document.getElementById(`sugerencias-marca-${idNum}`);
                if (sugerenciasMarca) {
                    sugerenciasMarca.remove();
                }
                productoItem.remove();
            }
            contadorProductos = 1;
        }, 3000);
        
    } catch (error) {
        console.error('Error enviando compra:', error);
        alert('❌ Error al enviar: ' + error.message);
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
    return `${dia}/${mes}/${año}`;  // Barras para CSV
}
