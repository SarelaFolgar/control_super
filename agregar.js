// ============================================
// CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ============================================
const AppState = {
    productosExistentes: [],
    supermercadosExistentes: [],
    historialCompras: [],
    contadorProductos: 1,
    apiActiva: false,
    ultimaVerificacionAPI: 0,
    TIEMPO_CACHE_API: 30000, // 30 segundos
    API_URL: 'https://control-super-api.onrender.com',
    MAX_INTENTOS_API: 3,
    TIEMPO_ESPERA_API: 15000 // 15 segundos máximo por intento
};

// ============================================
// FUNCIÓN AUXILIAR PARA PARSEAR FECHAS
// ============================================
function parsearFecha(fechaStr) {
    if (!fechaStr) return null;
    
    try {
        // Formato DD-MM-YYYY (el que tienes en tus datos)
        if (fechaStr.includes('-') && fechaStr.split('-')[0].length === 2) {
            const [dia, mes, año] = fechaStr.split('-').map(Number);
            return new Date(año, mes - 1, dia);
        }
        
        // Formato YYYY-MM-DD (por si acaso hay datos en este formato)
        if (fechaStr.includes('-') && fechaStr.split('-')[0].length === 4) {
            const [año, mes, dia] = fechaStr.split('-').map(Number);
            return new Date(año, mes - 1, dia);
        }
        
        // Formato DD/MM/YYYY (por si acaso)
        if (fechaStr.includes('/') && fechaStr.split('/')[0].length === 2) {
            const [dia, mes, año] = fechaStr.split('/').map(Number);
            return new Date(año, mes - 1, dia);
        }
        
        // Intento por defecto
        return new Date(fechaStr);
    } catch {
        return null;
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosExistentes();
    configurarFecha();
    configurarEventos();
    cargarSupermercados();
    cargarHistorialCompras();
    verificarEstadoAPI(true); // Verificación silenciosa inicial
    
    // Verificar API periódicamente cada 5 minutos
    setInterval(() => {
        verificarEstadoAPI(true);
    }, 5 * 60 * 1000);
});

// ============================================
// FUNCIÓN MEJORADA PARA VERIFICAR/DESPERTAR API
// ============================================
async function verificarEstadoAPI(silencioso = false) {
    const ahora = Date.now();
    
    // Usar caché si la API estaba activa hace menos de 30 segundos
    if (AppState.apiActiva && 
        (ahora - AppState.ultimaVerificacionAPI) < AppState.TIEMPO_CACHE_API) {
        return true;
    }
    
    if (!silencioso) {
        mostrarMensaje('⚡ Activando servicio de Render... (puede tomar 10-20 segundos)', 'info');
    }
    
    let ultimoError = '';
    
    try {
        // Intentar hasta 3 veces con delays crecientes
        for (let intento = 1; intento <= AppState.MAX_INTENTOS_API; intento++) {
            if (!silencioso && intento > 1) {
                mostrarMensaje(`⚡ Intento ${intento}/${AppState.MAX_INTENTOS_API}...`, 'info');
            }
            
            try {
                // Crear timeout para este intento
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), AppState.TIEMPO_ESPERA_API);
                
                const response = await fetch(`${AppState.API_URL}/api/status`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'online') {
                        AppState.apiActiva = true;
                        AppState.ultimaVerificacionAPI = ahora;
                        
                        if (!silencioso) {
                            mostrarMensaje('✅ Servicio activo y listo', 'success');
                            // Ocultar mensaje después de 2 segundos
                            setTimeout(() => {
                                const mensajeDiv = document.getElementById('mensaje');
                                if (mensajeDiv && mensajeDiv.textContent.includes('Servicio activo')) {
                                    mensajeDiv.textContent = '';
                                    mensajeDiv.className = 'mensaje';
                                }
                            }, 2000);
                        }
                        return true;
                    }
                } else {
                    ultimoError = `HTTP ${response.status}`;
                }
            } catch (error) {
                ultimoError = error.name === 'AbortError' ? 'Timeout' : error.message;
                
                // Solo mostrar en consola en modo debug
                if (!silencioso && intento === AppState.MAX_INTENTOS_API) {
                    console.log(`Intento ${intento} fallado:`, ultimoError);
                }
            }
            
            // Esperar antes del siguiente intento (con delay creciente)
            if (intento < AppState.MAX_INTENTOS_API) {
                const delay = 3000 * intento; // 3s, 6s, etc.
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // Si llegamos aquí, todos los intentos fallaron
        if (!silencioso) {
            mostrarMensaje('❌ Servicio temporalmente no disponible', 'error');
            console.log('Último error:', ultimoError);
        }
        
        AppState.apiActiva = false;
        return false;
        
    } catch (error) {
        console.error('Error crítico verificando API:', error);
        if (!silencioso) {
            mostrarMensaje('❌ Error de conexión. Verifica tu internet.', 'error');
        }
        AppState.apiActiva = false;
        return false;
    }
}

// ============================================
// FUNCIÓN PRINCIPAL PARA ENVIAR COMPRA
// ============================================
async function enviarCompra() {
    // 1. VALIDAR DATOS DEL FORMULARIO
    const productos = validarDatos();
    if (!productos) return;
    
    // 2. DESACTIVAR BOTÓN PARA EVITAR DOBLE CLIC
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    submitBtn.disabled = true;
    
    // 3. VERIFICAR/ACTIVAR API
    mostrarMensaje('🔄 Activando servicio de API...', 'info');
    
    const apiLista = await verificarEstadoAPI(false);
    if (!apiLista) {
        mostrarMensaje('❌ Servicio no disponible. Intenta nuevamente en 30 segundos.', 'error');
        // Reactivar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    // 4. PREPARAR DATOS PARA ENVIAR
    mostrarMensaje('📤 Preparando envío de datos...', 'info');
    
    const datosParaEnviar = {
        productos: productos
    };
    
    console.log('Enviando datos:', datosParaEnviar);
    
    // 5. ENVIAR DATOS A LA API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos máximo
        
        const response = await fetch(`${AppState.API_URL}/api/agregar-compra`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosParaEnviar),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Verificar respuesta
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.detail || errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `${errorMsg}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        
        console.log('Respuesta de API:', data);
        
        // 6. MOSTRAR RESULTADO
        mostrarMensaje(`✅ ${data.message || 'Compra enviada correctamente'}`, 'success');
        
        // Mostrar modal de éxito
        mostrarModalExito(`
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; color: #6b8e23; margin-bottom: 15px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 style="color: #4a6fa5; margin-bottom: 10px;">¡Compra Enviada!</h3>
                <p style="margin-bottom: 5px;">${data.message || 'Datos guardados correctamente'}</p>
                <p style="margin-bottom: 5px;"><strong>Productos:</strong> ${productos.length}</p>
                ${data.total_registros ? `<p style="margin-bottom: 15px;"><strong>Total registros:</strong> ${data.total_registros}</p>` : ''}
                <small style="color: #6c757d;">Los datos se procesarán en GitHub en 1-2 minutos</small>
            </div>
        `);
        
        // 7. LIMPIAR FORMULARIO DESPUÉS DE ÉXITO
        setTimeout(() => {
            limpiarFormulario();
            // Reactivar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 1000);
        
    } catch (error) {
        console.error('Error enviando compra:', error);
        
        // Reactivar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Mostrar error apropiado
        let mensajeError = '❌ Error al enviar la compra';
        
        if (error.name === 'AbortError') {
            mensajeError = '⏰ Tiempo de espera agotado. El servicio está iniciando, intenta en 30 segundos.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mensajeError = '❌ Error de conexión. Verifica tu internet.';
        } else if (error.message.includes('Method Not Allowed')) {
            mensajeError = '❌ Error 405: Verifica la URL del endpoint.';
        } else {
            mensajeError = `❌ Error: ${error.message}`;
        }
        
        mostrarMensaje(mensajeError, 'error');
    }
}

// ============================================
// MODAL DE ÉXITO PERSONALIZADO
// ============================================
function mostrarModalExito(contenidoHTML) {
    // Crear modal si no existe
    let modal = document.getElementById('modal-exito');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-exito';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 0;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transform: translateY(20px);
            transition: transform 0.3s ease;
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModalExito();
            }
        });
        
        // Cerrar con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.parentNode) {
                cerrarModalExito();
            }
        });
    }
    
    // Actualizar contenido
    const modalContent = modal.querySelector('div');
    modalContent.innerHTML = contenidoHTML + `
        <div style="border-top: 1px solid #eee; padding: 15px; text-align: center;">
            <button id="modal-ok-btn" style="
                background: #4a6fa5;
                color: white;
                border: none;
                padding: 10px 30px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: background 0.2s;
            " onmouseover="this.style.background='#3a5a80'" 
              onmouseout="this.style.background='#4a6fa5'">
              Aceptar
            </button>
        </div>
    `;
    
    // Configurar botón Aceptar
    document.getElementById('modal-ok-btn').addEventListener('click', function() {
        cerrarModalExito();
        // Redirigir a index.html después de cerrar modal
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 300);
    });
    
    // Mostrar modal con animación
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('div').style.transform = 'translateY(0)';
    }, 10);
}

function cerrarModalExito() {
    const modal = document.getElementById('modal-exito');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('div').style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Cargar productos y supermercados del JSON
async function cargarDatosExistentes() {
    try {
        const response = await fetch('datos_super.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const datos = await response.json();
        
        // Extraer productos únicos
        AppState.productosExistentes = [...new Set(datos.map(item => item.producto))].sort();
        
        console.log(`✅ ${AppState.productosExistentes.length} productos cargados para sugerencias`);
    } catch (error) {
        console.warn('⚠️ No se pudieron cargar datos existentes:', error.message);
        // No mostrar error al usuario para no asustar
    }
}

// Cargar historial completo para autocompletado
async function cargarHistorialCompras() {
    try {
        const response = await fetch('datos_super.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        AppState.historialCompras = await response.json();
        console.log(`📊 ${AppState.historialCompras.length} registros históricos cargados`);
    } catch (error) {
        console.warn('⚠️ No se pudo cargar historial:', error.message);
    }
}

// Cargar supermercados existentes
async function cargarSupermercados() {
    try {
        const response = await fetch('datos_super.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const datos = await response.json();
        
        // Extraer supermercados únicos
        AppState.supermercadosExistentes = [...new Set(datos.map(item => item.super))].sort();
        
        const select = document.getElementById('supermercado');
        if (!select) return;
        
        // Limpiar opciones excepto la primera
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Añadir supermercados existentes
        AppState.supermercadosExistentes.forEach(supermercado => {
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
        console.warn('⚠️ Error cargando supermercados:', error.message);
    }
}

// Configurar fecha por defecto (hoy)
function configurarFecha() {
    const hoy = new Date();
    const fechaInput = document.getElementById('fecha');
    
    if (fechaInput) {
        // Formato YYYY-MM-DD para input type="date"
        const fechaFormateada = hoy.toISOString().split('T')[0];
        fechaInput.value = fechaFormateada;
    }
}

// Configurar eventos
function configurarEventos() {
    // Supermercado: mostrar/ocultar campo "Otro"
    const selectSuper = document.getElementById('supermercado');
    const inputNuevoSuper = document.getElementById('nuevo-super');
    
    if (selectSuper && inputNuevoSuper) {
        selectSuper.addEventListener('change', function() {
            if (this.value === 'otro') {
                inputNuevoSuper.style.display = 'block';
                inputNuevoSuper.focus();
            } else {
                inputNuevoSuper.style.display = 'none';
                inputNuevoSuper.value = '';
            }
        });
        
        // Cuando cambia el supermercado, actualizar sugerencias de productos
        selectSuper.addEventListener('change', function() {
            if (this.value !== 'otro') {
                actualizarProductosPorSupermercado(this.value);
            }
        });
    }
    
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
    
    // Autocompletar cuando se selecciona un producto
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('sugerencia-item')) {
            const productoSeleccionado = e.target.textContent;
            const inputProducto = e.target.parentElement.previousElementSibling;
            const idNum = inputProducto.id.split('-')[1];
            
            autocompletarDesdeHistorial(idNum, productoSeleccionado);
        }
    });
    
    // Sugerencias de marcas cuando se empieza a escribir
    document.addEventListener('input', function(e) {
        if (e.target.id && e.target.id.startsWith('marca-')) {
            mostrarSugerenciasMarcas(e.target);
        }
    });
    
    // Enviar formulario
    const form = document.getElementById('compra-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            enviarCompra();
        });
    }
    
    // Limpiar campos cuando se escribe una marca nueva
    document.addEventListener('change', function(e) {
        if (e.target.id && e.target.id.startsWith('marca-')) {
            const idNum = e.target.id.split('-')[1];
            const productoInput = document.getElementById(`producto-${idNum}`);
            const supermercadoSelect = document.getElementById('supermercado');
            const supermercado = supermercadoSelect && supermercadoSelect.value === 'otro' 
                ? document.getElementById('nuevo-super').value.trim()
                : supermercadoSelect ? supermercadoSelect.value : '';
            
            const productoNombre = productoInput ? productoInput.value.trim() : '';
            const marcaSeleccionada = e.target.value.trim();
            
            if (productoNombre && supermercado && supermercado !== 'otro' && marcaSeleccionada) {
                verificarYAutocompletarMarca(idNum, productoNombre, supermercado, marcaSeleccionada);
            }
        }
    });
}

// Limpiar formulario después de éxito
function limpiarFormulario() {
    // Resetear formulario
    const form = document.getElementById('compra-form');
    if (form) form.reset();
    
    configurarFecha();
    
    // Mantener solo un producto
    const productosContainer = document.getElementById('productos-container');
    if (productosContainer) {
        while (productosContainer.children.length > 1) {
            const productoItem = productosContainer.lastChild;
            const idNum = productoItem.querySelector('[id^="marca-"]').id.split('-')[1];
            const sugerenciasMarca = document.getElementById(`sugerencias-marca-${idNum}`);
            if (sugerenciasMarca) {
                sugerenciasMarca.remove();
            }
            productoItem.remove();
        }
        AppState.contadorProductos = 1;
        
        // Restaurar sugerencias de marca para el primer producto
        const inputMarca = document.getElementById('marca-1');
        if (inputMarca) {
            inputMarca.addEventListener('focus', function() {
                mostrarSugerenciasMarcas(this);
            });
        }
    }
}

// Actualizar lista de productos según supermercado seleccionado
function actualizarProductosPorSupermercado(supermercado) {
    if (!supermercado || supermercado === 'otro') return;
    
    // Filtrar productos comprados en este supermercado
    const productosEnSuper = [...new Set(
        AppState.historialCompras
            .filter(item => item.super === supermercado)
            .map(item => item.producto)
    )].sort();
    
    // Actualizar la lista global de sugerencias
    AppState.productosExistentes = productosEnSuper;
    
    console.log(`🏪 ${productosEnSuper.length} productos disponibles en ${supermercado}`);
}

// Autocompletar campos basado en historial - CON DEBUG
function autocompletarDesdeHistorial(idNum, productoNombre) {
    const supermercadoSelect = document.getElementById('supermercado');
    const supermercado = supermercadoSelect && supermercadoSelect.value === 'otro' 
        ? document.getElementById('nuevo-super').value.trim()
        : supermercadoSelect ? supermercadoSelect.value : '';
    
    if (!supermercado || supermercado === 'otro') {
        console.log('⚠️  Selecciona un supermercado primero');
        return;
    }
    
    // Buscar TODOS los registros para este producto en este supermercado
    const registrosProducto = AppState.historialCompras
        .filter(item => 
            item.super === supermercado && 
            item.producto === productoNombre
        );
    
    console.log(`🔍 Buscando ${productoNombre} en ${supermercado}:`, registrosProducto.length, 'registros encontrados');
    
    if (registrosProducto.length > 0) {
        // Mostrar todas las fechas antes de ordenar
        console.log('📅 Fechas encontradas (sin ordenar):');
        registrosProducto.forEach((reg, idx) => {
            const fechaParsed = parsearFecha(reg.fecha);
            console.log(`  ${idx + 1}. ${reg.fecha} -> ${fechaParsed ? fechaParsed.toISOString() : 'INVÁLIDA'} | Precio: ${reg.precio}`);
        });
        
        // Ordenar por fecha DESCENDENTE (más reciente primero)
        registrosProducto.sort((a, b) => {
            const fechaA = parsearFecha(a.fecha);
            const fechaB = parsearFecha(b.fecha);
            
            // Si alguna fecha es inválida, ponerla al final
            if (!fechaA || isNaN(fechaA.getTime())) return 1;
            if (!fechaB || isNaN(fechaB.getTime())) return -1;
            
            // Orden descendente (más reciente primero)
            return fechaB.getTime() - fechaA.getTime();
        });
        
        // Mostrar orden después de ordenar
        console.log('📅 Fechas después de ordenar:');
        registrosProducto.forEach((reg, idx) => {
            const fechaParsed = parsearFecha(reg.fecha);
            console.log(`  ${idx + 1}. ${reg.fecha} -> ${fechaParsed ? fechaParsed.toISOString() : 'INVÁLIDA'} | Precio: ${reg.precio}`);
        });
        
        const ultimoRegistro = registrosProducto[0];
        
        // Autocompletar campos
        const marcaInput = document.getElementById(`marca-${idNum}`);
        const unidadSelect = document.getElementById(`unidad-${idNum}`);
        const cantidadInput = document.getElementById(`cantidad-${idNum}`);
        const precioInput = document.getElementById(`precio-${idNum}`);
        
        if (marcaInput) marcaInput.value = ultimoRegistro.marca || 'no aplica';
        if (unidadSelect) unidadSelect.value = ultimoRegistro.unidad || 'g';
        
        // Sugerir cantidad (mantener la que ya tenía el usuario)
        if (cantidadInput && !cantidadInput.value) {
            cantidadInput.value = ultimoRegistro.cantidad || '';
        }
        
        // Sugerir precio (mantener el que ya tenía el usuario)
        if (precioInput && !precioInput.value) {
            precioInput.value = ultimoRegistro.precio || '';
        }
        
        console.log(`✅ Autocompletado con ÚLTIMO registro: ${productoNombre} en ${supermercado}`);
        console.log(`   Fecha: ${ultimoRegistro.fecha}, Precio: ${ultimoRegistro.precio}, Marca: ${ultimoRegistro.marca}`);
        console.log(`   Total registros encontrados: ${registrosProducto.length}`);
        
        // Calcular precio unitario
        calcularPrecioUnitario(cantidadInput);
        
    } else {
        console.log(`ℹ️  No hay historial para ${productoNombre} en ${supermercado}`);
    }
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
    
    // Filtrar productos que coincidan
    const matches = AppState.productosExistentes
        .filter(producto => producto.toLowerCase().includes(valor))
        .slice(0, 8);
    
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
            
            autocompletarDesdeHistorial(input.id.split('-')[1], producto);
        });
        sugerenciasDiv.appendChild(div);
    });
    
    sugerenciasDiv.style.display = 'block';
}

// Mostrar sugerencias de marcas para un producto específico
function mostrarSugerenciasMarcas(input) {
    const idNum = input.id.split('-')[1];
    const productoInput = document.getElementById(`producto-${idNum}`);
    const productoNombre = productoInput ? productoInput.value.trim() : '';
    const supermercadoSelect = document.getElementById('supermercado');
    const supermercado = supermercadoSelect && supermercadoSelect.value === 'otro' 
        ? document.getElementById('nuevo-super').value.trim()
        : supermercadoSelect ? supermercadoSelect.value : '';
    
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
        AppState.historialCompras
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
            
            autocompletarConMarcaEspecifica(idNum, productoNombre, supermercado, marca);
        });
        sugerenciasDiv.appendChild(div);
    });
    
    sugerenciasDiv.style.display = 'block';
}

// Verificar si la marca escrita existe y autocompletar
function verificarYAutocompletarMarca(idNum, productoNombre, supermercado, marcaSeleccionada) {
    // Buscar si esta marca existe para este producto y supermercado
    const registros = AppState.historialCompras
        .filter(item => 
            item.super === supermercado && 
            item.producto === productoNombre &&
            item.marca === marcaSeleccionada
        )
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (registros.length > 0) {
        autocompletarConMarcaEspecifica(idNum, productoNombre, supermercado, marcaSeleccionada);
    } else {
        console.log(`🆕 Marca nueva: ${marcaSeleccionada} para ${productoNombre} en ${supermercado}`);
    }
}

// Autocompletar con datos de una marca específica
function autocompletarConMarcaEspecifica(idNum, productoNombre, supermercado, marcaEspecifica) {
    // Buscar TODOS los registros para esta combinación exacta
    const registros = AppState.historialCompras
        .filter(item => 
            item.super === supermercado && 
            item.producto === productoNombre &&
            item.marca === marcaEspecifica
        );
    
    if (registros.length > 0) {
        // Ordenar por fecha DESCENDENTE (más reciente primero)
        registros.sort((a, b) => {
            const fechaA = parsearFecha(a.fecha);
            const fechaB = parsearFecha(b.fecha);
            
            if (!fechaA || isNaN(fechaA.getTime())) return 1;
            if (!fechaB || isNaN(fechaB.getTime())) return -1;
            
            return fechaB.getTime() - fechaA.getTime();
        });
        
        const ultimoRegistro = registros[0];
        
        // Actualizar campos si existen
        const cantidadInput = document.getElementById(`cantidad-${idNum}`);
        const unidadSelect = document.getElementById(`unidad-${idNum}`);
        const precioInput = document.getElementById(`precio-${idNum}`);
        
        if (cantidadInput) cantidadInput.value = ultimoRegistro.cantidad || '';
        if (unidadSelect) unidadSelect.value = ultimoRegistro.unidad || 'g';
        if (precioInput) precioInput.value = ultimoRegistro.precio || '';
        
        console.log(`✅ Autocompletado con ÚLTIMO registro de marca específica: ${marcaEspecifica} (Fecha: ${ultimoRegistro.fecha})`);
        console.log(`   Total registros encontrados: ${registros.length}`);
        
        // Calcular precio unitario
        calcularPrecioUnitario(cantidadInput);
        
    } else {
        console.log(`🆕 Marca nueva detectada: ${marcaEspecifica} para ${productoNombre}`);
    }
}
// Calcular precio por kg o unidad
function calcularPrecioUnitario(elemento) {
    if (!elemento) return;
    
    const idNum = elemento.id.split('-')[1];
    const cantidadInput = document.getElementById(`cantidad-${idNum}`);
    const precioInput = document.getElementById(`precio-${idNum}`);
    const unidadSelect = document.getElementById(`unidad-${idNum}`);
    const precioCalcDiv = document.getElementById(`precio-calc-${idNum}`);
    
    if (!cantidadInput || !precioInput || !unidadSelect || !precioCalcDiv) return;
    
    const cantidad = parseFloat(cantidadInput.value) || 0;
    const precio = parseFloat(precioInput.value) || 0;
    const unidad = unidadSelect.value;
    
    if (cantidad <= 0 || precio <= 0) {
        precioCalcDiv.querySelector('span').textContent = '-';
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
    AppState.contadorProductos++;
    const container = document.getElementById('productos-container');
    
    if (!container) return;
    
    const nuevoProducto = document.createElement('div');
    nuevoProducto.className = 'producto-item';
    nuevoProducto.innerHTML = `
        <h3>Producto ${AppState.contadorProductos}</h3>
        
        <div class="form-group">
            <label for="producto-${AppState.contadorProductos}">Producto:</label>
            <input type="text" id="producto-${AppState.contadorProductos}" class="producto-input" 
                   placeholder="Ej: lomo adobado, pan, arroz...">
            <div class="sugerencias" id="sugerencias-${AppState.contadorProductos}"></div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="cantidad-${AppState.contadorProductos}">Cantidad:</label>
                <input type="number" id="cantidad-${AppState.contadorProductos}" step="0.01" placeholder="Ej: 1000">
            </div>
            <div class="form-group">
                <label for="unidad-${AppState.contadorProductos}">Unidad:</label>
                <select id="unidad-${AppState.contadorProductos}">
                    <option value="g">g (gramos)</option>
                    <option value="ud">ud (unidades)</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="marca-${AppState.contadorProductos}">Marca:</label>
                <input type="text" id="marca-${AppState.contadorProductos}" placeholder="Ej: no aplica">
            </div>
            <div class="form-group">
                <label for="precio-${AppState.contadorProductos}">Precio (€):</label>
                <input type="number" id="precio-${AppState.contadorProductos}" step="0.01" placeholder="Ej: 2.81">
            </div>
        </div>
        
        <div class="precio-calculado" id="precio-calc-${AppState.contadorProductos}">
            <small>Precio por 1kg/unidad: <span>-</span></small>
        </div>
        
        <button type="button" class="btn-eliminar" onclick="eliminarProducto(this)">
            <i class="fas fa-trash"></i> Eliminar
        </button>
    `;
    
    container.appendChild(nuevoProducto);
    
    // Añadir eventos para el nuevo producto
    const inputProducto = document.getElementById(`producto-${AppState.contadorProductos}`);
    const inputMarca = document.getElementById(`marca-${AppState.contadorProductos}`);
    
    if (inputProducto) {
        inputProducto.addEventListener('blur', function() {
            if (this.value.trim()) {
                const idNum = this.id.split('-')[1];
                autocompletarDesdeHistorial(idNum, this.value.trim());
            }
        });
    }
    
    if (inputMarca) {
        inputMarca.addEventListener('focus', function() {
            mostrarSugerenciasMarcas(this);
        });
        
        inputMarca.addEventListener('blur', function() {
            const idNum = this.id.split('-')[1];
            const productoInput = document.getElementById(`producto-${idNum}`);
            const supermercadoSelect = document.getElementById('supermercado');
            const supermercado = supermercadoSelect && supermercadoSelect.value === 'otro' 
                ? document.getElementById('nuevo-super').value.trim()
                : supermercadoSelect ? supermercadoSelect.value : '';
            
            const productoNombre = productoInput ? productoInput.value.trim() : '';
            const marcaSeleccionada = this.value.trim();
            
            if (productoNombre && supermercado && supermercado !== 'otro' && marcaSeleccionada) {
                verificarYAutocompletarMarca(idNum, productoNombre, supermercado, marcaSeleccionada);
            }
        });
    }
}

// Eliminar producto
function eliminarProducto(boton) {
    if (AppState.contadorProductos <= 1) {
        mostrarMensaje('Debe haber al menos un producto', 'error');
        return;
    }
    
    const productoItem = boton.closest('.producto-item');
    if (!productoItem) return;
    
    // Eliminar también las sugerencias de marca asociadas
    const marcaInput = productoItem.querySelector('[id^="marca-"]');
    if (marcaInput) {
        const idNum = marcaInput.id.split('-')[1];
        const sugerenciasMarca = document.getElementById(`sugerencias-marca-${idNum}`);
        if (sugerenciasMarca) {
            sugerenciasMarca.remove();
        }
    }
    
    productoItem.remove();
    AppState.contadorProductos--;
    
    // Renumerar productos
    const productos = document.querySelectorAll('.producto-item');
    productos.forEach((item, index) => {
        const newNum = index + 1;
        const title = item.querySelector('h3');
        if (title) title.textContent = `Producto ${newNum}`;
        
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
    const fechaInput = document.getElementById('fecha');
    const supermercadoSelect = document.getElementById('supermercado');
    const nuevoSuperInput = document.getElementById('nuevo-super');
    
    if (!fechaInput || !supermercadoSelect) {
        mostrarMensaje('Error: formulario no encontrado', 'error');
        return false;
    }
    
    const fecha = fechaInput.value;
    const supermercado = supermercadoSelect.value === 'otro' 
        ? nuevoSuperInput ? nuevoSuperInput.value.trim() : ''
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
    
    if (supermercadoSelect.value === 'otro' && supermercado.length < 2) {
        mostrarMensaje('Escriba el nombre del supermercado', 'error');
        return false;
    }
    
    // Validar productos
    const productosValidos = [];
    
    for (let i = 1; i <= AppState.contadorProductos; i++) {
        const productoInput = document.getElementById(`producto-${i}`);
        const cantidadInput = document.getElementById(`cantidad-${i}`);
        const precioInput = document.getElementById(`precio-${i}`);
        const marcaInput = document.getElementById(`marca-${i}`);
        const unidadSelect = document.getElementById(`unidad-${i}`);
        
        if (!productoInput || !cantidadInput || !precioInput || !marcaInput || !unidadSelect) {
            mostrarMensaje(`Error en Producto ${i}: campos no encontrados`, 'error');
            return false;
        }
        
        const producto = productoInput.value.trim();
        const cantidad = parseFloat(cantidadInput.value);
        const precio = parseFloat(precioInput.value);
        const marca = marcaInput.value.trim() || 'no aplica';
        const unidad = unidadSelect.value;
        
        if (!producto || producto.length < 2) {
            mostrarMensaje(`Producto ${i}: escriba un nombre válido`, 'error');
            productoInput.focus();
            return false;
        }
        
        if (isNaN(cantidad) || cantidad <= 0) {
            mostrarMensaje(`Producto ${i}: cantidad inválida`, 'error');
            cantidadInput.focus();
            return false;
        }
        
        if (isNaN(precio) || precio <= 0) {
            mostrarMensaje(`Producto ${i}: precio inválido`, 'error');
            precioInput.focus();
            return false;
        }
        
        productosValidos.push({
            fecha: formatearFechaParaJSON(fecha),
            super: supermercado.toLowerCase(),
            producto: producto.toLowerCase(),
            cantidad: cantidad,
            unidad: unidad,
            marca: marca.toLowerCase(),
            precio: precio
        });
    }
    
    console.log(`${productosValidos.length} productos validados`);
    return productosValidos;
}

// Formatear fecha para JSON (YYYY-MM-DD)
function formatearFechaParaJSON(fechaString) {
    // Si ya está en formato YYYY-MM-DD, devolverlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
        return fechaString;
    }
    
    // Si no, convertir desde formato de input date
    const fecha = new Date(fechaString);
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Mostrar mensajes
function mostrarMensaje(texto, tipo = 'info') {
    const mensajeDiv = document.getElementById('mensaje');
    
    if (!mensajeDiv) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    
    // Auto-ocultar después de tiempo (excepto errores importantes)
    if (tipo !== 'error' && !texto.includes('Activando') && !texto.includes('Verificando')) {
        setTimeout(() => {
            if (mensajeDiv.textContent === texto) {
                mensajeDiv.textContent = '';
                mensajeDiv.className = 'mensaje';
            }
        }, 5000);
    }
}
