// Variables globales
let productosData = [];
let uniqueProducts = [];
let supermarkets = new Set();
let cities = new Set();
let brands = new Set();
let availableYears = new Set();
let currentChart = null;
let currentSearchTerm = '';
let selectedProducts = []; // Array para almacenar productos seleccionados
let currentFilters = {
    city: 'global',
    priceType: 'precio_neto'
};

// Elementos DOM
const screens = {
    main: document.getElementById('main-screen'),
    results: document.getElementById('results-screen'),
    variation: document.getElementById('variation-screen'),
    inflation: document.getElementById('inflation-screen'),
    products: document.getElementById('products-screen'),
    filter: document.getElementById('filter-screen'),
    date: document.getElementById('date-screen')
};

// Funciones helper para fechas
function parsearFecha(fechaStr) {
    if (!fechaStr) return null;
    
    try {
        // Si ya es una fecha válida
        if (fechaStr instanceof Date && !isNaN(fechaStr)) {
            return fechaStr;
        }
        
        // Formato DD-MM-YYYY
        if (fechaStr.includes('-') && fechaStr.split('-')[0].length === 2) {
            const [dia, mes, año] = fechaStr.split('-').map(Number);
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

function formatearFechaParaMostrar(fecha) {
    if (!fecha) return 'Fecha inválida';
    
    let dateObj;
    
    // Si ya es un objeto Date válido
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        dateObj = fecha;
    }
    // Si es un timestamp (número)
    else if (typeof fecha === 'number') {
        dateObj = new Date(fecha);
    }
    // Si es un string
    else if (typeof fecha === 'string') {
        dateObj = parsearFecha(fecha);
    }
    // Si no es ninguno de los anteriores
    else {
        return 'Fecha inválida';
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
    }
    
    return dateObj.toLocaleDateString('es-ES');
}

// Función auxiliar para obtener rango de fechas
function obtenerRangoFechas(filteredData) {
    if (!filteredData || filteredData.length === 0) return null;
    
    const fechasValidas = filteredData
        .map(p => {
            const fechaParsed = parsearFecha(p.fecha);
            return fechaParsed && !isNaN(fechaParsed.getTime()) ? fechaParsed : null;
        })
        .filter(date => date !== null);
    
    if (fechasValidas.length === 0) return null;
    
    const minFecha = new Date(Math.min(...fechasValidas.map(d => d.getTime())));
    const maxFecha = new Date(Math.max(...fechasValidas.map(d => d.getTime())));
    
    return { min: minFecha, max: maxFecha };
}

// Obtener etiqueta para tipo de precio
function getPriceTypeLabel(priceType) {
    return priceType === 'precio_neto' ? 'Precio neto (€/unidad)' : 'Precio real (€)';
}

// Obtener campo de precio según tipo
function getPriceField(item) {
    if (currentFilters.priceType === 'precio_neto') {
        return item.precio_neto !== undefined ? item.precio_neto : item.precio;
    } else {
        return item.precio !== undefined ? item.precio : item.precio_neto;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    try {
        await loadData();
        initEventListeners();
        setupSearch();
        setupNavigation();
        setupMobileMenu();
        setupAddProductSearch();
        updateStats();
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        showError(`Error al inicializar la aplicación: ${error.message}`);
    }
});

// Configurar elementos DOM adicionales
function setupAdditionalElements() {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            if (tabType === 'increases') {
                showTopVariations('increases');
            } else {
                showTopVariations('decreases');
            }
        });
    });
}

// Configurar menú móvil
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        closeMenu.addEventListener('click', () => {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
        });

        mainContent.addEventListener('click', () => {
            if (window.innerWidth <= 992 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// Configurar búsqueda para añadir productos
function setupAddProductSearch() {
    const searchInput = document.getElementById('add-product-search');
    const suggestions = document.getElementById('add-suggestions');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (!suggestions) return;
        
        suggestions.innerHTML = '';
        
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        const matches = uniqueProducts
            .filter(product => {
                const productLower = product.toLowerCase();
                // Excluir productos ya seleccionados
                return productLower.includes(query) && 
                       !selectedProducts.some(p => p.toLowerCase() === productLower);
            })
            .slice(0, 8);
        
        if (matches.length === 0) {
            suggestions.style.display = 'none';
            return;
        }
        
        matches.forEach(product => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<i class="fas fa-plus-circle"></i> ${product}`;
            div.addEventListener('click', () => {
                addProductToComparison(product);
                searchInput.value = '';
                suggestions.innerHTML = '';
                suggestions.style.display = 'none';
            });
            suggestions.appendChild(div);
        });
        
        suggestions.style.display = 'block';
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                const exactMatch = uniqueProducts.find(p => 
                    p.toLowerCase() === query.toLowerCase() &&
                    !selectedProducts.some(sp => sp.toLowerCase() === p.toLowerCase())
                );
                if (exactMatch) {
                    addProductToComparison(exactMatch);
                    searchInput.value = '';
                    suggestions.innerHTML = '';
                    suggestions.style.display = 'none';
                }
            }
        }
    });
    
    document.addEventListener('click', (e) => {
        if (suggestions && 
            !searchInput.contains(e.target) && 
            !suggestions.contains(e.target)) {
            suggestions.innerHTML = '';
            suggestions.style.display = 'none';
        }
    });
}

// Añadir producto a la comparación
function addProductToComparison(productName) {
    if (selectedProducts.includes(productName)) {
        showError(`"${productName}" ya está en la comparación`);
        return;
    }
    
    selectedProducts.push(productName);
    updateSelectedProductsList();
    
    if (screens.results.classList.contains('active')) {
        updateComparisonChart();
    }
    
    console.log(`✅ Producto añadido: ${productName}`);
}

// Eliminar producto de la comparación
function removeProductFromComparison(productName) {
    const index = selectedProducts.indexOf(productName);
    if (index > -1) {
        selectedProducts.splice(index, 1);
        updateSelectedProductsList();
        
        if (screens.results.classList.contains('active')) {
            if (selectedProducts.length > 0) {
                updateComparisonChart();
            } else {
                // Si no hay productos, mostrar gráfico vacío
                const canvas = document.getElementById('price-chart');
                const chartContainer = canvas.parentElement.parentElement;
                const existingError = chartContainer.querySelector('.chart-info-message');
                if (existingError) existingError.remove();
                
                if (currentChart instanceof Chart) {
                    currentChart.destroy();
                    currentChart = null;
                }
                
                const ctx = canvas.getContext('2d');
                currentChart = new Chart(ctx, {
                    type: 'line',
                    data: { datasets: [] },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { 
                            x: { 
                                type: 'time', 
                                title: { 
                                    display: true, 
                                    text: 'Fecha',
                                    font: { size: 12, weight: 'bold' }
                                } 
                            }, 
                            y: { 
                                title: { 
                                    display: true, 
                                    text: getPriceTypeLabel(currentFilters.priceType),
                                    font: { size: 12, weight: 'bold' }
                                } 
                            } 
                        } 
                    }
                });
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'chart-info-message';
                infoDiv.innerHTML = '<p><i class="fas fa-info-circle"></i> Añade productos para comparar precios</p>';
                chartContainer.appendChild(infoDiv);
                
                document.getElementById('brand-details').innerHTML = '<p class="no-data">Añade productos para ver detalles</p>';
            }
        }
    }
}

// Actualizar lista de productos seleccionados
function updateSelectedProductsList() {
    const container = document.getElementById('selected-products-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    selectedProducts.forEach(product => {
        const badge = document.createElement('div');
        badge.style.cssText = `
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 0.5rem 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            font-weight: 500;
        `;
        
        badge.innerHTML = `
            <span>${product}</span>
            <button onclick="removeProductFromComparison('${product.replace(/'/g, "\\'")}')" 
                    style="background: none; border: none; color: #dc3545; cursor: pointer; padding: 0.2rem; border-radius: 50%;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(badge);
    });
    
    // Configurar botón limpiar
    const clearBtn = document.getElementById('clear-products-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            selectedProducts = [];
            updateSelectedProductsList();
            
            const canvas = document.getElementById('price-chart');
            const chartContainer = canvas.parentElement.parentElement;
            const existingError = chartContainer.querySelector('.chart-info-message');
            if (existingError) existingError.remove();
            
            if (currentChart instanceof Chart) {
                currentChart.destroy();
                currentChart = null;
            }
            
            const ctx = canvas.getContext('2d');
            currentChart = new Chart(ctx, {
                type: 'line',
                data: { datasets: [] },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: { 
                            type: 'time', 
                            title: { 
                                display: true, 
                                text: 'Fecha',
                                font: { size: 12, weight: 'bold' }
                            } 
                        }, 
                        y: { 
                            title: { 
                                display: true, 
                                text: getPriceTypeLabel(currentFilters.priceType),
                                font: { size: 12, weight: 'bold' }
                            } 
                        } 
                    } 
                }
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chart-info-message';
            infoDiv.innerHTML = '<p><i class="fas fa-info-circle"></i> Añade productos para comparar precios</p>';
            chartContainer.appendChild(infoDiv);
            
            document.getElementById('brand-details').innerHTML = '<p class="no-data">Añade productos para ver detalles</p>';
        };
    }
}

// Cargar datos
async function loadData() {
    showLoading('Cargando datos...');
    
    try {
        console.log('📂 Cargando datos...');
        const response = await fetch('./datos_super.json');
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        productosData = await response.json();
        console.log(`✅ ${productosData.length} registros cargados`);
        
        processData();
        
        const now = new Date();
        const updateText = now.toLocaleDateString('es-ES') + ' ' + 
                          now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
        
        const sidebarUpdate = document.getElementById('sidebar-update');
        if (sidebarUpdate) sidebarUpdate.textContent = updateText;
        
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) lastUpdate.textContent = updateText;
            
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        showError(`Error cargando datos: ${error.message}`);
        throw error;
    } finally {
        hideLoading();
    }
}

// Procesar datos
function processData() {
    uniqueProducts = [...new Set(productosData.map(p => p.producto))].sort();
    supermarkets = new Set(productosData.map(p => p.super).filter(Boolean));
    cities = new Set(productosData.map(p => p.ciudad).filter(Boolean));
    brands = new Set(productosData.map(p => p.marca).filter(Boolean));
    
    availableYears.clear();
    productosData.forEach(item => {
        for (const key in item) {
            if (key.startsWith('variacion_') && key !== 'variacion_total') {
                const year = key.replace('variacion_', '');
                if (!isNaN(year) && item[key] !== null && item[key] !== undefined) {
                    availableYears.add(year);
                }
            }
        }
    });
    
    console.log(`📊 ${uniqueProducts.length} productos únicos`);
    console.log(`🏪 ${supermarkets.size} supermercados`);
    console.log(`🏙️ ${cities.size} ciudades`);
    console.log(`🏷️ ${brands.size} marcas`);
}

// Actualizar estadísticas
function updateStats() {
    console.log('📈 Actualizando estadísticas...');
    
    try {
        const totalProductsElem = document.getElementById('total-products');
        const totalSupermarketsElem = document.getElementById('total-supermarkets');
        const totalCitiesElem = document.getElementById('total-cities');
        const totalRecordsElem = document.getElementById('total-records');
        const footerTotalDataElem = document.getElementById('footer-total-data');
        const allProductsCountElem = document.getElementById('all-products-count');
        const allProductsRecordsElem = document.getElementById('all-products-records');
        const dateRangeElem = document.getElementById('date-range');
        
        if (totalProductsElem) totalProductsElem.textContent = uniqueProducts.length;
        if (totalSupermarketsElem) totalSupermarketsElem.textContent = supermarkets.size;
        if (totalCitiesElem) totalCitiesElem.textContent = cities.size;
        if (totalRecordsElem) totalRecordsElem.textContent = productosData.length;
        if (footerTotalDataElem) footerTotalDataElem.textContent = productosData.length;
        if (allProductsCountElem) allProductsCountElem.textContent = uniqueProducts.length;
        if (allProductsRecordsElem) allProductsRecordsElem.textContent = productosData.length;
        
        const fechas = productosData
            .map(p => parsearFecha(p.fecha))
            .filter(date => date && !isNaN(date.getTime()));
        
        if (fechas.length > 0 && dateRangeElem) {
            const minDate = new Date(Math.min(...fechas.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...fechas.map(d => d.getTime())));
            const dateText = `${minDate.getFullYear()}-${maxDate.getFullYear()}`;
            dateRangeElem.textContent = dateText;
        } else if (dateRangeElem) {
            dateRangeElem.textContent = '-';
        }
        
        console.log('✅ Estadísticas actualizadas');
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
    }
}

// Configurar navegación
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && href !== '') {
                if (window.innerWidth <= 992) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.classList.remove('active');
                    document.body.style.overflow = '';
                }
                return;
            }
            
            e.preventDefault();
            const action = this.dataset.action;
            
            if (!action) return;
            
            if (window.innerWidth <= 992) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
            
            document.querySelectorAll('.nav-link').forEach(l => {
                const lHref = l.getAttribute('href');
                if (!lHref || lHref === '#' || lHref === '') {
                    l.classList.remove('active');
                }
            });
            this.classList.add('active');
            
            handleNavigationAction(action);
        });
    });
    
    document.querySelectorAll('.stat-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleNavigationAction(action);
        });
    });
    
    document.querySelectorAll('.action-card').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action === 'agregar-datos') {
                return; // Este es un enlace externo
            }
            handleNavigationAction(action);
        });
    });
    
    document.querySelectorAll('.variation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action === 'top-increases') {
                showTopVariations('increases');
            } else if (action === 'top-decreases') {
                showTopVariations('decreases');
            }
        });
    });
}

// Manejar acciones de navegación
function handleNavigationAction(action) {
    switch(action) {
        case 'main':
            showScreen('main');
            break;
        case 'variation-analysis':
            showVariationAnalysis();
            break;
        case 'inflation-analysis':
            showInflationAnalysis();
            break;
        case 'all-products':
            showAllProducts();
            break;
        case 'by-supermarket':
            showFilterScreen('supermarket', Array.from(supermarkets).sort());
            break;
        case 'by-city':
            showFilterScreen('city', Array.from(cities).sort());
            break;
        case 'by-date':
            showDateSummary();
            break;
    }
}

// Configurar búsqueda principal
function setupSearch() {
    const searchInput = document.getElementById('product-search');
    const searchBtn = document.getElementById('search-btn');
    const suggestions = document.getElementById('suggestions');
    
    if (!searchInput || !searchBtn) return;
    
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            selectedProducts = [query]; // Empezar con el producto buscado
            searchProduct(query);
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                selectedProducts = [query]; // Empezar con el producto buscado
                searchProduct(query);
            }
        }
    });
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const suggestionsElem = document.getElementById('suggestions');
        
        if (!suggestionsElem) return;
        
        suggestionsElem.innerHTML = '';
        
        if (query.length < 2) {
            suggestionsElem.style.display = 'none';
            return;
        }
        
        const matches = uniqueProducts
            .filter(product => product.toLowerCase().includes(query))
            .slice(0, 8);
        
        if (matches.length === 0) {
            suggestionsElem.style.display = 'none';
            return;
        }
        
        matches.forEach(product => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<i class="fas fa-search"></i> ${product}`;
            div.addEventListener('click', () => {
                searchInput.value = product;
                suggestionsElem.innerHTML = '';
                suggestionsElem.style.display = 'none';
                selectedProducts = [product]; // Empezar con el producto seleccionado
                searchProduct(product);
            });
            suggestionsElem.appendChild(div);
        });
        
        suggestionsElem.style.display = 'block';
    });
    
    document.addEventListener('click', (e) => {
        if (suggestions && 
            !searchInput.contains(e.target) && 
            !suggestions.contains(e.target)) {
            suggestions.innerHTML = '';
            suggestions.style.display = 'none';
        }
    });
}

// Buscar producto (ahora maneja múltiples productos)
function searchProduct(productName) {
    const query = productName.toLowerCase().trim();
    if (!query) return;
    
    console.log('🔍 Buscando:', query);
    currentSearchTerm = query;
    showLoading('Cargando productos...');
    
    try {
        // Verificar que todos los productos seleccionados existen
        const allProductsExist = selectedProducts.every(product => {
            const matches = productosData.filter(p => 
                p.producto && p.producto.toLowerCase() === product.toLowerCase()
            );
            return matches.length > 0;
        });
        
        if (!allProductsExist) {
            const nonExisting = selectedProducts.filter(product => {
                const matches = productosData.filter(p => 
                    p.producto && p.producto.toLowerCase() === product.toLowerCase()
                );
                return matches.length === 0;
            });
            
            showError(`Producto no encontrado: ${nonExisting.join(', ')}`);
            hideLoading();
            return;
        }
        
        const titleElem = document.getElementById('product-title');
        if (titleElem) {
            if (selectedProducts.length === 1) {
                titleElem.textContent = selectedProducts[0];
            } else {
                titleElem.textContent = `Comparando ${selectedProducts.length} productos`;
            }
        }
        
        currentFilters = { 
            city: 'global',
            priceType: 'precio_neto'
        };
        
        updateSelectedProductsList();
        updateComparisonChart();
        setupFiltersSimplified();
        
        showScreen('results');
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const mainNavLink = document.querySelector('[data-action="main"]');
        if (mainNavLink) mainNavLink.classList.add('active');
        
        console.log('✅ Productos mostrados correctamente');
        
    } catch (error) {
        console.error('❌ Error en searchProduct:', error);
        showError('Error al mostrar el producto: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Actualizar gráfico de comparación
function updateComparisonChart() {
    console.log('📈 Actualizando gráfico de comparación...');
    
    const canvas = document.getElementById('price-chart');
    if (!canvas) return;
    
    const chartContainer = canvas.parentElement.parentElement;
    const existingError = chartContainer.querySelector('.chart-info-message');
    if (existingError) existingError.remove();
    
    if (currentChart instanceof Chart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    // Actualizar información del tipo de precio
    const priceTypeInfo = document.getElementById('price-type-info');
    if (priceTypeInfo) {
        const span = priceTypeInfo.querySelector('span');
        if (span) {
            span.textContent = getPriceTypeLabel(currentFilters.priceType);
        }
    }
    
    try {
        // Obtener datos de todos los productos seleccionados
        let allData = [];
        selectedProducts.forEach(productName => {
            const productData = productosData.filter(p => 
                p.producto && p.producto.toLowerCase() === productName.toLowerCase()
            );
            allData = allData.concat(productData);
        });
        
        // Aplicar filtro de ciudad
        let filteredData = allData;
        if (currentFilters.city !== 'global') {
            filteredData = filteredData.filter(item => item.ciudad === currentFilters.city);
        }
        
        console.log(`🌍 Datos después de filtros:`, filteredData.length, 'registros');
        
        if (!filteredData || filteredData.length === 0) {
            const ctx = canvas.getContext('2d');
            currentChart = new Chart(ctx, {
                type: 'line',
                data: { datasets: [] },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: { 
                            type: 'time', 
                            title: { 
                                display: true, 
                                text: 'Fecha',
                                font: { size: 12, weight: 'bold' }
                            } 
                        }, 
                        y: { 
                            title: { 
                                display: true, 
                                text: getPriceTypeLabel(currentFilters.priceType),
                                font: { size: 12, weight: 'bold' }
                            } 
                        } 
                    } 
                }
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chart-info-message';
            infoDiv.innerHTML = `<p><i class="fas fa-info-circle"></i> No hay datos disponibles con los filtros actuales</p>`;
            chartContainer.appendChild(infoDiv);
            
            return;
        }
        
        const groups = {};
        const ciudadesDisponibles = new Set();
        
        filteredData.forEach(item => {
            if (!item) return;
            
            if (item.ciudad) ciudadesDisponibles.add(item.ciudad);
            
            const producto = item.producto;
            const marca = item.marca || 'Sin marca';
            const supermercado = item.super || 'Sin supermercado';
            const key = `${producto} | ${marca} | ${supermercado}`;
            
            if (!groups[key]) groups[key] = { producto: producto, marca: marca, super: supermercado, datos: [] };
            
            const fecha = parsearFecha(item.fecha);
            if (isNaN(fecha.getTime())) {
                console.warn('Fecha inválida:', item.fecha);
                return;
            }
            
            const precio = getPriceField(item);
            if (typeof precio !== 'number' || isNaN(precio)) {
                console.warn('Precio inválido:', precio);
                return;
            }
            
            groups[key].datos.push({ 
                fecha: fecha, 
                precio: precio,
                ciudad: item.ciudad || 'Desconocida'
            });
        });
        
        console.log('Grupos encontrados:', Object.keys(groups).length);
        
        const validGroups = {};
        for (const [key, group] of Object.entries(groups)) {
            if (group.datos.length > 0) {
                group.datos.sort((a, b) => a.fecha - b.fecha);
                validGroups[key] = group;
            }
        }
        
        if (Object.keys(validGroups).length === 0) {
            const ctx = canvas.getContext('2d');
            currentChart = new Chart(ctx, {
                type: 'line',
                data: { datasets: [] },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: { 
                            type: 'time', 
                            title: { 
                                display: true, 
                                text: 'Fecha',
                                font: { size: 12, weight: 'bold' }
                            } 
                        }, 
                        y: { 
                            title: { 
                                display: true, 
                                text: getPriceTypeLabel(currentFilters.priceType),
                                font: { size: 12, weight: 'bold' }
                            } 
                        } 
                    } 
                }
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chart-info-message';
            infoDiv.innerHTML = '<p><i class="fas fa-info-circle"></i> No hay suficientes datos para mostrar líneas en el gráfico</p>';
            chartContainer.appendChild(infoDiv);
            
            return;
        }
        
        const datasets = [];
        const colors = ['#4a6fa5', '#6b8e23', '#8b4513', '#2c3e50', '#7d3c98', '#16a085', '#e67e22', '#3498db', '#1abc9c', '#9b59b6', '#34495e', '#27ae60', '#8e44ad', '#2c3e50', '#f39c12'];
        
        Object.entries(validGroups).forEach(([combinacion, group], index) => {
            const { producto, marca, super: supermercado, datos } = group;
            
            let label = `${producto}`;
            if (selectedProducts.length > 1) {
                label = `${producto} (${marca} - ${supermercado})`;
            }
            
            if (datos.length >= 2) {
                const firstPrice = datos[0].precio;
                const lastPrice = datos[datos.length - 1].precio;
                if (firstPrice > 0) {
                    const variacion = ((lastPrice - firstPrice) / firstPrice) * 100;
                    label = `${producto} ${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`;
                }
            }
            
            datasets.push({
                label: label,
                data: datos.map(d => ({ x: d.fecha, y: d.precio })),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                borderWidth: datos.length >= 2 ? 2 : 0,
                tension: 0.2,
                fill: false,
                pointRadius: datos.length === 1 ? 6 : 4,
                pointHoverRadius: datos.length === 1 ? 10 : 6,
                pointBackgroundColor: colors[index % colors.length],
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                showLine: datos.length >= 2
            });
        });
        
        console.log('Datasets preparados:', datasets.length);
        
        const ctx = canvas.getContext('2d');
        
        const config = {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { 
                        position: 'top', 
                        labels: { 
                            font: { size: 11 }, 
                            padding: 8, 
                            usePointStyle: true, 
                            pointStyle: 'circle', 
                            boxWidth: 8 
                        } 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const precio = context.parsed.y;
                                const fecha = new Date(context.parsed.x);
                                return `${precio.toFixed(2)}€ (${fecha.toLocaleDateString('es-ES')})`;
                            },
                            title: function(context) {
                                return context[0].dataset.label || '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { 
                            unit: 'month', 
                            displayFormats: { month: 'MMM yyyy' }, 
                            tooltipFormat: 'dd/MM/yyyy' 
                        },
                        title: { 
                            display: true, 
                            text: 'Fecha', 
                            font: { size: 12, weight: 'bold' } 
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y: {
                        beginAtZero: false,
                        title: { 
                            display: true, 
                            text: getPriceTypeLabel(currentFilters.priceType), 
                            font: { size: 12, weight: 'bold' } 
                        },
                        ticks: { 
                            callback: function(value) { 
                                return value.toFixed(2) + '€'; 
                            } 
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                }
            }
        };
        
        currentChart = new Chart(ctx, config);
        console.log('✅ Gráfico creado exitosamente');
        
        updateBrandDetails(filteredData);
        
    } catch (error) {
        console.error('❌ Error al crear gráfico:', error);
        
        const ctx = canvas.getContext('2d');
        currentChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    x: { 
                        type: 'time', 
                        title: { 
                            display: true, 
                            text: 'Fecha',
                            font: { size: 12, weight: 'bold' }
                        } 
                    }, 
                    y: { 
                        title: { 
                            display: true, 
                            text: getPriceTypeLabel(currentFilters.priceType),
                            font: { size: 12, weight: 'bold' }
                        } 
                    } 
                } 
            }
        });
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-info-message';
        errorDiv.innerHTML = `<p><i class="fas fa-info-circle"></i> Error al crear el gráfico</p><p><small>Intenta buscar otro producto o cambiar los filtros</small></p>`;
        chartContainer.appendChild(errorDiv);
    }
}

// Configurar filtros simplificados (solo ciudad y tipo de precio)
function setupFiltersSimplified() {
    const citySelect = document.getElementById('city-filter');
    const priceTypeSelect = document.getElementById('price-type-filter');
    
    if (!citySelect || !priceTypeSelect) return;
    
    // Obtener ciudades disponibles de los productos seleccionados
    let ciudadesDisponibles = new Set();
    selectedProducts.forEach(productName => {
        const productData = productosData.filter(p => 
            p.producto && p.producto.toLowerCase() === productName.toLowerCase()
        );
        productData.forEach(item => {
            if (item.ciudad) ciudadesDisponibles.add(item.ciudad);
        });
    });
    
    updateFilterSelector(citySelect, Array.from(ciudadesDisponibles).sort(), currentFilters.city);
    priceTypeSelect.value = currentFilters.priceType;
    
    // Configurar evento de cambio para cada filtro
    const applyFilter = () => {
        const selectedCity = citySelect.value;
        const selectedPriceType = priceTypeSelect.value;
        
        currentFilters = { 
            city: selectedCity,
            priceType: selectedPriceType
        };
        
        console.log(`🌍 Aplicando filtros automáticamente: Ciudad=${selectedCity}, TipoPrecio=${selectedPriceType}`);
        
        showLoading('Actualizando gráfico...');
        setTimeout(() => {
            updateComparisonChart();
            hideLoading();
        }, 100);
    };
    
    // Aplicar automáticamente al cambiar cualquier filtro
    citySelect.addEventListener('change', applyFilter);
    priceTypeSelect.addEventListener('change', applyFilter);
}

function updateFilterSelector(selectElement, options, selectedValue) {
    if (!selectElement) return;
    
    const currentValue = selectElement.value;
    const firstOption = selectElement.options[0];
    selectElement.innerHTML = '';
    if (firstOption) selectElement.appendChild(firstOption);
    
    options.sort();
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        selectElement.appendChild(opt);
    });
    
    if (options.includes(currentValue)) selectElement.value = currentValue;
    else selectElement.value = selectedValue;
}

// Actualizar detalles por producto
function updateBrandDetails(filteredData) {
    const container = document.getElementById('brand-details');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!filteredData || filteredData.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos de detalles</p>';
        return;
    }
    
    const groups = {};
    filteredData.forEach(item => {
        if (!item) return;
        
        const producto = item.producto;
        const marca = item.marca || 'Sin marca';
        const supermercado = item.super || 'Sin supermercado';
        const key = `${producto} | ${marca} | ${supermercado}`;
        
        if (!groups[key]) groups[key] = { producto: producto, marca: marca, super: supermercado, datos: [] };
        groups[key].datos.push(item);
    });
    
    console.log('Grupos para detalles:', Object.keys(groups).length);
    
    Object.entries(groups).forEach(([combinacion, group]) => {
        if (group.datos.length === 0) return;
        
        group.datos.sort((a, b) => parsearFecha(a.fecha) - parsearFecha(b.fecha));
        
        const firstItem = group.datos[0];
        const lastItem = group.datos[group.datos.length - 1];
        
        const firstPrice = getPriceField(firstItem);
        const lastPrice = getPriceField(lastItem);
        
        let variacion = 0;
        let variacionTexto = 'N/A';
        if (firstPrice > 0 && typeof firstPrice === 'number') {
            variacion = ((lastPrice - firstPrice) / firstPrice) * 100;
            variacionTexto = `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`;
        }
        
        const precioPromedio = group.datos.reduce((sum, item) => {
            const precio = getPriceField(item);
            return sum + precio;
        }, 0) / group.datos.length;
        
        const card = document.createElement('div');
        card.className = 'brand-card';
        card.innerHTML = `
            <div class="brand-header">
                <h4>${group.producto}</h4>
                <span class="super-badge">${group.super}</span>
            </div>
            <div class="brand-info">
                <div>
                    <small>Marca</small>
                    <p>${group.marca}</p>
                </div>
                <div>
                    <small>Primer ${currentFilters.priceType === 'precio_neto' ? 'precio neto' : 'precio real'}</small>
                    <p>${firstPrice.toFixed(2)}€</p>
                    <small class="date">${formatearFechaParaMostrar(firstItem.fecha)}</small>
                </div>
                <div>
                    <small>Último ${currentFilters.priceType === 'precio_neto' ? 'precio neto' : 'precio real'}</small>
                    <p>${lastPrice.toFixed(2)}€</p>
                    <small class="date">${formatearFechaParaMostrar(lastItem.fecha)}</small>
                </div>
                <div>
                    <small>Variación</small>
                    <p class="${variacion >= 0 ? 'positive' : 'negative'}">${variacionTexto}</p>
                </div>
                <div>
                    <small>Promedio</small>
                    <p>${precioPromedio.toFixed(2)}€</p>
                </div>
                <div>
                    <small>Registros</small>
                    <p>${group.datos.length}</p>
                </div>
            </div>
            <div class="brand-meta">
                <span><i class="fas fa-database"></i> ${group.datos.length} registros</span>
                <span><i class="fas fa-money-bill-wave"></i> ${currentFilters.priceType === 'precio_neto' ? 'Precio neto' : 'Precio real'}</span>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    if (container.innerHTML === '') {
        container.innerHTML = '<p class="no-data">No hay datos agrupados con los filtros actuales</p>';
    }
}

// Mostrar todos los productos
function showAllProducts() {
    showScreen('products');
    updateAllProductsList();
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const allProductsNavLink = document.querySelector('[data-action="all-products"]');
    if (allProductsNavLink) allProductsNavLink.classList.add('active');
}

// Actualizar lista de productos
function updateAllProductsList() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    uniqueProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `<p>${product}</p>`;
        item.addEventListener('click', () => {
            selectedProducts = [product];
            searchProduct(product);
        });
        productsGrid.appendChild(item);
    });
    
    const filterInput = document.getElementById('products-filter');
    const clearBtn = document.getElementById('clear-filter');
    
    if (filterInput) {
        filterInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            const items = productsGrid.querySelectorAll('.product-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = query === '' || text.includes(query) ? 'block' : 'none';
            });
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (filterInput) filterInput.value = '';
            const items = productsGrid.querySelectorAll('.product-item');
            items.forEach(item => item.style.display = 'block');
        });
    }
}

// Mostrar resumen por fecha
function showDateSummary() {
    showScreen('date');
    
    const years = {};
    
    productosData.forEach(item => {
        if (!item.fecha) return;
        
        try {
            let year = null;
            
            if (item.fecha.includes('-')) {
                const parts = item.fecha.split('-');
                if (parts.length === 3) {
                    if (parts[2].length === 4) year = parts[2];
                    else if (parts[0].length === 4) year = parts[0];
                }
            }
            
            if (!year) {
                const dateObj = parsearFecha(item.fecha);
                if (dateObj && !isNaN(dateObj.getTime())) year = dateObj.getFullYear().toString();
            }
            
            if (!year && item.ano) year = item.ano.toString();
            if (!year) return;
            
            if (!years[year]) {
                years[year] = { count: 0, products: new Set(), supermarkets: new Set(), cities: new Set() };
            }
            
            years[year].count++;
            if (item.producto && item.producto.trim() !== '') years[year].products.add(item.producto.trim());
            if (item.super && item.super.trim() !== '') years[year].supermarkets.add(item.super.trim());
            if (item.ciudad && item.ciudad.trim() !== '') years[year].cities.add(item.ciudad.trim());
            
        } catch (error) {
            console.warn('Error procesando registro:', item, error);
        }
    });
    
    const yearCards = document.getElementById('year-cards');
    if (yearCards) {
        yearCards.innerHTML = '';
        
        const sortedYears = Object.keys(years).sort((a, b) => b - a);
        
        if (sortedYears.length === 0) {
            yearCards.innerHTML = '<p class="no-data">No hay datos por año disponibles</p>';
        } else {
            sortedYears.forEach(year => {
                const data = years[year];
                const card = document.createElement('div');
                card.className = 'year-card';
                card.innerHTML = `
                    <h3>Año ${year}</h3>
                    <div class="year-stats">
                        <div class="year-stat">
                            <small>Registros</small>
                            <p>${data.count}</p>
                        </div>
                        <div class="year-stat">
                            <small>Productos</small>
                            <p>${data.products.size}</p>
                        </div>
                        <div class="year-stat">
                            <small>Supermercados</small>
                            <p>${data.supermarkets.size}</p>
                        </div>
                        <div class="year-stat">
                            <small>Ciudades</small>
                            <p>${data.cities.size}</p>
                        </div>
                    </div>
                `;
                yearCards.appendChild(card);
            });
        }
    }
    
    const chartData = {};
    Object.keys(years).forEach(year => chartData[year] = years[year].count);
    
    const canvas = document.getElementById('records-chart');
    if (!canvas) return;
    
    createYearChart(chartData);
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const dateNavLink = document.querySelector('[data-action="by-date"]');
    if (dateNavLink) dateNavLink.classList.add('active');
}

// Mostrar análisis de variación
function showVariationAnalysis() {
    showScreen('variation');
    
    document.querySelectorAll('.variation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action === 'top-increases') showTopVariations('increases');
            else if (action === 'top-decreases') showTopVariations('decreases');
        });
    });
    
    showTopVariations('increases');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const variationNavLink = document.querySelector('[data-action="variation-analysis"]');
    if (variationNavLink) variationNavLink.classList.add('active');
}

// Mostrar top productos con variación
function showTopVariations(type) {
    showLoading('Calculando variaciones...');
    
    const latestProducts = new Map();
    
    productosData.forEach(item => {
        if (!item.producto || !item.super) return;
        
        const key = `${item.producto}||${item.marca || 'Sin marca'}||${item.super}`;
        const currentDate = parsearFecha(item.fecha);
        
        if (!latestProducts.has(key) || currentDate > parsearFecha(latestProducts.get(key).fecha)) {
            latestProducts.set(key, {
                fecha: currentDate,
                producto: item.producto,
                marca: item.marca || 'Sin marca',
                super: item.super,
                variacion_total: item.variacion_total || 0
            });
        }
    });
    
    const productsWithVariation = Array.from(latestProducts.values())
        .filter(item => item.variacion_total !== null && item.variacion_total !== 0);
    
    if (type === 'increases') {
        productsWithVariation.sort((a, b) => b.variacion_total - a.variacion_total);
        const titleElem = document.querySelector('#variation-screen .screen-title h2');
        if (titleElem) titleElem.textContent = 'Mayores Subidas';
    } else {
        productsWithVariation.sort((a, b) => a.variacion_total - b.variacion_total);
        const titleElem = document.querySelector('#variation-screen .screen-title h2');
        if (titleElem) titleElem.textContent = 'Mayores Bajadas';
    }
    
    const containerId = type === 'increases' ? 'top-increases' : 'top-decreases';
    const container = document.getElementById(containerId);
    const otherContainerId = type === 'increases' ? 'top-decreases' : 'top-increases';
    const otherContainer = document.getElementById(otherContainerId);
    
    if (container && otherContainer) {
        container.classList.remove('hidden');
        otherContainer.classList.add('hidden');
    }
    
    if (container) {
        container.innerHTML = '';
        
        const topItems = productsWithVariation.slice(0, 15);
        
        if (topItems.length === 0) {
            container.innerHTML = '<p class="no-data">No hay datos suficientes</p>';
        } else {
            topItems.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'top-item';
                itemElement.innerHTML = `
                    <div class="top-rank">${index + 1}</div>
                    <div class="top-info">
                        <h4>${item.producto}</h4>
                        <div class="product-details">
                            <span><i class="fas fa-tag"></i> ${item.marca}</span>
                            <span><i class="fas fa-store"></i> ${item.super}</span>
                        </div>
                        <div class="top-stats">
                            <span>Variación total</span>
                            <span class="${item.variacion_total >= 0 ? 'positive' : 'negative'}">
                                ${item.variacion_total >= 0 ? '+' : ''}${item.variacion_total.toFixed(1)}%
                            </span>
                        </div>
                        <small>Última actualización: ${formatearFechaParaMostrar(item.fecha)}</small>
                    </div>
                    <button class="view-btn" onclick="addProductToComparison('${item.producto.replace(/'/g, "\\'")}')">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                container.appendChild(itemElement);
            });
        }
    }
    
    document.querySelectorAll('#variation-screen .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === type) btn.classList.add('active');
    });
    
    hideLoading();
}

// Mostrar análisis de inflación
function showInflationAnalysis() {
    showScreen('inflation');
    updateInflationStats();
    
    const cityFilter = document.getElementById('city-inflation-filter');
    const yearFilter = document.getElementById('year-inflation-filter');
    
    if (cityFilter) {
        updateFilterSelector(cityFilter, Array.from(cities), 'global');
        cityFilter.addEventListener('change', updateInflationStats);
    }
    
    if (yearFilter) {
        while (yearFilter.options.length > 1) yearFilter.remove(1);
        
        const sortedYears = Array.from(availableYears).sort();
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `Año ${year}`;
            yearFilter.appendChild(option);
        });
        
        yearFilter.addEventListener('change', updateInflationStats);
    }
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const inflationNavLink = document.querySelector('[data-action="inflation-analysis"]');
    if (inflationNavLink) inflationNavLink.classList.add('active');
}

// Actualizar estadísticas de inflación
function updateInflationStats() {
    const cityFilter = document.getElementById('city-inflation-filter');
    const yearFilter = document.getElementById('year-inflation-filter');
    const statsContainer = document.getElementById('inflation-stats');
    
    if (!cityFilter || !yearFilter || !statsContainer) return;
    
    const selectedCity = cityFilter.value;
    const selectedYear = yearFilter.value;
    
    let filteredData = productosData;
    if (selectedCity !== 'global') filteredData = filteredData.filter(item => item.ciudad === selectedCity);
    
    let result = null;
    let excludedProducts = 0;
    let totalCombinations = 0;
    
    if (selectedYear === 'total') {
        const combinationCounts = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            const key = `${item.producto}||${item.super}||${item.marca}`;
            combinationCounts.set(key, (combinationCounts.get(key) || 0) + 1);
        });
        
        totalCombinations = combinationCounts.size;
        const validCombinations = new Set();
        combinationCounts.forEach((count, key) => {
            if (count > 2) validCombinations.add(key);
            else excludedProducts++;
        });
        
        const latestVariations = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            const key = `${item.producto}||${item.super}||${item.marca}`;
            if (!validCombinations.has(key)) return;
            if (item.variacion_total === null || item.variacion_total === undefined) return;
            
            const currentDate = parsearFecha(item.fecha);
            
            if (!latestVariations.has(key) || currentDate > parsearFecha(latestVariations.get(key).fecha)) {
                latestVariations.set(key, { fecha: currentDate, variacion: item.variacion_total });
            }
        });
        
        const validVariations = Array.from(latestVariations.values()).map(v => v.variacion);
        const validProductsCount = latestVariations.size;
        
        result = {
            title: 'Inflación Total',
            description: 'Variación media de precios (solo productos con ≥3 registros totales)',
            inflation: validVariations.length > 0 ? validVariations.reduce((a, b) => a + b, 0) / validVariations.length : 0,
            productCount: validProductsCount,
            recordCount: validVariations.length,
            excludedCount: excludedProducts,
            totalCombinations: totalCombinations,
            year: 'Total'
        };
        
    } else {
        const yearField = `variacion_${selectedYear}`;
        const combinationYearCounts = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            
            const fechaParsed = parsearFecha(item.fecha);
            const itemYear = fechaParsed ? fechaParsed.getFullYear().toString() : null;
            if (itemYear !== selectedYear) return;
            
            if (item[yearField] === null || item[yearField] === undefined) return;
            
            const key = `${item.producto}||${item.super}||${item.marca}`;
            combinationYearCounts.set(key, (combinationYearCounts.get(key) || 0) + 1);
        });
        
        totalCombinations = combinationYearCounts.size;
        const validCombinations = new Set();
        combinationYearCounts.forEach((count, key) => {
            if (count > 2) validCombinations.add(key);
            else excludedProducts++;
        });
        
        const latestVariations = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            
            const fechaParsed = parsearFecha(item.fecha);
            const itemYear = fechaParsed ? fechaParsed.getFullYear().toString() : null;
            if (itemYear !== selectedYear) return;
            
            const key = `${item.producto}||${item.super}||${item.marca}`;
            if (!validCombinations.has(key)) return;
            if (item[yearField] === null || item[yearField] === undefined) return;
            
            const currentDate = parsearFecha(item.fecha);
            
            if (!latestVariations.has(key) || currentDate > parsearFecha(latestVariations.get(key).fecha)) {
                latestVariations.set(key, { fecha: currentDate, variacion: item[yearField] });
            }
        });
        
        const validVariations = Array.from(latestVariations.values()).map(v => v.variacion);
        const validProductsCount = latestVariations.size;
        
        result = {
            title: `Inflación ${selectedYear}`,
            description: `Variación media durante el año ${selectedYear} (solo productos con ≥3 registros en ${selectedYear})`,
            inflation: validVariations.length > 0 ? validVariations.reduce((a, b) => a + b, 0) / validVariations.length : 0,
            productCount: validProductsCount,
            recordCount: validVariations.length,
            excludedCount: excludedProducts,
            totalCombinations: totalCombinations,
            year: selectedYear
        };
    }
    
    statsContainer.innerHTML = `
        <div class="inflation-stat-card highlight">
            <div class="inflation-stat-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="inflation-stat-content">
                <h4>${result.title}</h4>
                <p class="inflation-stat-number ${result.inflation >= 0 ? 'positive' : 'negative'}">
                    ${result.inflation >= 0 ? '+' : ''}${result.inflation.toFixed(1)}%
                </p>
                <small>${result.description}</small>
                ${result.excludedCount > 0 ? `<br><small class="excluded-info"><i class="fas fa-filter"></i> ${result.excludedCount} productos excluidos (menos de 3 registros)</small>` : ''}
            </div>
        </div>
        
        <div class="inflation-stat-card">
            <div class="inflation-stat-icon">
                <i class="fas fa-box"></i>
            </div>
            <div class="inflation-stat-content">
                <h4>Productos Analizados</h4>
                <p class="inflation-stat-number">${result.productCount}</p>
                <small>Combinaciones con suficientes datos (≥3 registros)</small>
                ${result.totalCombinations > 0 ? `<br><small>De ${result.totalCombinations} combinaciones totales</small>` : ''}
            </div>
        </div>
        
        <div class="inflation-stat-card">
            <div class="inflation-stat-icon">
                <i class="fas fa-database"></i>
            </div>
            <div class="inflation-stat-content">
                <h4>Variaciones Válidas</h4>
                <p class="inflation-stat-number">${result.recordCount}</p>
                <small>Variaciones después de aplicar filtros</small>
            </div>
        </div>
        
        <div class="inflation-stat-card">
            <div class="inflation-stat-icon">
                <i class="fas fa-calendar"></i>
            </div>
            <div class="inflation-stat-content">
                <h4>Período</h4>
                <p class="inflation-stat-number">${result.year}</p>
                <small>Año de análisis</small>
            </div>
        </div>
        
        ${result.excludedCount > 0 ? `
        <div class="inflation-stat-card info-card">
            <div class="inflation-stat-icon">
                <i class="fas fa-info-circle"></i>
            </div>
            <div class="inflation-stat-content">
                <h4>Nota Metodológica</h4>
                <p>Se excluyeron ${result.excludedCount} productos por tener menos de 3 registros.</p>
                <small>Esto asegura que la inflación se calcule solo con datos confiables.</small>
            </div>
        </div>
        ` : ''}
    `;
}

// Mostrar filtros
function showFilterScreen(filterType, options) {
    const container = document.getElementById('filter-options');
    const results = document.getElementById('filter-results');
    
    if (!container || !results) return;
    
    container.innerHTML = '';
    results.innerHTML = '';
    
    if (filterType === 'supermarket') document.getElementById('filter-title').textContent = 'Filtrar por Supermercado';
    else if (filterType === 'city') document.getElementById('filter-title').textContent = 'Filtrar por Ciudad';
    else if (filterType === 'brand') document.getElementById('filter-title').textContent = 'Filtrar por Marca';
    
    options.forEach(option => {
        if (!option) return;
        const button = document.createElement('button');
        button.className = 'filter-option';
        button.innerHTML = `<i class="fas fa-${filterType === 'supermarket' ? 'store' : filterType === 'city' ? 'city' : 'tag'}"></i> ${option}`;
        button.addEventListener('click', () => showFilterResults(filterType, option));
        container.appendChild(button);
    });
    
    showScreen('filter');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const filterNavLink = document.querySelector(`[data-action="by-${filterType}"]`);
    if (filterNavLink) filterNavLink.classList.add('active');
}

// Mostrar resultados de filtro
function showFilterResults(filterType, value) {
    const results = document.getElementById('filter-results');
    if (!results) return;
    
    let filteredData;
    if (filterType === 'supermarket') filteredData = productosData.filter(p => p.super === value);
    else if (filterType === 'city') filteredData = productosData.filter(p => p.ciudad === value);
    else if (filterType === 'brand') filteredData = productosData.filter(p => p.marca === value);
    
    const uniqueProductsInFilter = [...new Set(filteredData.map(p => p.producto))];
    
    const rangoFechas = obtenerRangoFechas(filteredData);
    
    results.innerHTML = `
        <h3>${value}</h3>
        <div class="filter-stats">
            <div>
                <small>Registros</small>
                <p>${filteredData.length}</p>
            </div>
            <div>
                <small>Productos</small>
                <p>${uniqueProductsInFilter.length}</p>
            </div>
            <div>
                <small>Rango de fechas</small>
                <p>${rangoFechas ? 
                    formatearFechaParaMostrar(rangoFechas.min) + ' - ' + formatearFechaParaMostrar(rangoFechas.max) 
                    : 'Fechas no disponibles'}</p>
            </div>
        </div>
        <div class="filter-products">
            <h4>Productos principales:</h4>
            ${uniqueProductsInFilter.slice(0, 10).map(product => `
                <div class="filter-product-item">
                    <span>${product}</span>
                    <button onclick="addProductToComparison('${product.replace(/'/g, "\\'")}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// Crear gráfico de años
function createYearChart(years) {
    console.log('📊 Creando gráfico de años con datos:', years);
    
    const canvas = document.getElementById('records-chart');
    if (!canvas) {
        console.error('❌ Canvas #records-chart no encontrado');
        return;
    }
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        console.log('Destruyendo gráfico anterior');
        existingChart.destroy();
    }
    
    const sortedYears = Object.keys(years).sort();
    const counts = sortedYears.map(year => years[year]);
    
    console.log('Años ordenados:', sortedYears);
    console.log('Conteos:', counts);
    
    if (sortedYears.length === 0 || counts.length === 0) {
        console.warn('No hay datos para el gráfico');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos disponibles', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    try {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedYears,
                datasets: [{
                    label: 'Registros',
                    data: counts,
                    backgroundColor: 'rgba(74, 111, 165, 0.7)',
                    borderColor: 'rgba(74, 111, 165, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Registros: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Número de registros', font: { weight: 'bold' } },
                        ticks: { precision: 0 }
                    },
                    x: {
                        title: { display: true, text: 'Año', font: { weight: 'bold' } }
                    }
                }
            }
        });
        console.log('✅ Gráfico creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando gráfico:', error);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#d9534f';
        ctx.textAlign = 'center';
        ctx.fillText('Error al crear gráfico', canvas.width / 2, canvas.height / 2);
    }
}

// Event Listeners adicionales
function initEventListeners() {
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const backTo = this.dataset.back || 'main';
            showScreen(backTo);
            if (backTo === 'main') {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                const mainNavLink = document.querySelector('[data-action="main"]');
                if (mainNavLink) mainNavLink.classList.add('active');
            }
        });
    });
    
    document.querySelectorAll('#variation-screen .tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            document.querySelectorAll('#variation-screen .tab-btn').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            if (tabType === 'increases') showTopVariations('increases');
            else showTopVariations('decreases');
        });
    });
    setupAdditionalElements();
}

// Mostrar/ocultar pantallas
function showScreen(screenName) {
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    
    if (screens[screenName]) screens[screenName].classList.add('active');
}

// Utilidades
function showLoading(message = 'Cargando...') {
    const loading = document.getElementById('loading');
    const loadingMessage = document.getElementById('loading-message');
    if (loading) {
        if (loadingMessage && message) loadingMessage.textContent = message;
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
}

function showError(message) {
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    if (errorToast && errorMessage) {
        errorMessage.textContent = message;
        errorToast.classList.remove('hidden');
        setTimeout(() => errorToast.classList.add('hidden'), 5000);
    } else {
        alert(message);
    }
}

// Hacer funciones disponibles globalmente
window.searchProduct = searchProduct;
window.hideError = hideError;
window.addProductToComparison = addProductToComparison;
window.removeProductFromComparison = removeProductFromComparison;
