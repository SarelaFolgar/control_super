// Variables globales
let productosData = [];
let uniqueProducts = [];
let supermarkets = new Set();
let cities = new Set();
let brands = new Set();
let availableYears = new Set();
let currentChart = null;
let currentProductData = null;
let currentSearchTerm = '';
let currentFilters = {
    city: 'global',
    supermarket: 'global',
    brand: 'global'
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

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    try {
        await loadData();
        initEventListeners();
        setupSearch();
        setupNavigation();
        setupMobileMenu();
        updateStats(); // Asegurar que se actualicen las estadísticas
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        showError(`Error al inicializar la aplicación: ${error.message}`);
    }
});

// Configurar elementos DOM adicionales
function setupAdditionalElements() {
    // Configurar botones de tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            
            // Actualizar tabs activos
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar contenido correspondiente
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
            document.body.style.overflow = 'hidden'; // Prevenir scroll
        });

        closeMenu.addEventListener('click', () => {
            sidebar.classList.remove('active');
            document.body.style.overflow = ''; // Restaurar scroll
        });

        // Cerrar menú al hacer clic fuera en móvil
        mainContent.addEventListener('click', () => {
            if (window.innerWidth <= 992 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
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
        
        // Procesar datos
        processData();
        
        // Actualizar fecha en sidebar
        const now = new Date();
        const updateText = now.toLocaleDateString('es-ES') + ' ' + 
                          now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
        
        // Usar optional chaining para evitar errores
        const sidebarUpdate = document.getElementById('sidebar-update');
        if (sidebarUpdate) {
            sidebarUpdate.textContent = updateText;
        }
        
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) {
            lastUpdate.textContent = updateText;
        }
            
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
    // Productos únicos
    uniqueProducts = [...new Set(productosData.map(p => p.producto))].sort();
    
    // Supermercados
    supermarkets = new Set(productosData.map(p => p.super).filter(Boolean));
    
    // Ciudades
    cities = new Set(productosData.map(p => p.ciudad).filter(Boolean));
    
    // Marcas
    brands = new Set(productosData.map(p => p.marca).filter(Boolean));
    
    // Años disponibles dinámicamente
    availableYears.clear();
    productosData.forEach(item => {
        // Buscar campos de variación por año dinámicamente
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
    console.log(`📅 Años disponibles:`, Array.from(availableYears).sort());
}

// Actualizar estadísticas
function updateStats() {
    console.log('📈 Actualizando estadísticas...');
    
    try {
        // Actualizar contadores principales
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
        
        // Calcular rango de fechas
        const fechas = productosData
            .map(p => {
                try {
                    return new Date(p.fecha);
                } catch {
                    return null;
                }
            })
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
    // Navegación lateral - PARA TODOS LOS ENLACES .nav-link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Si tiene href y es un enlace real (no #), dejar que navegue normalmente
            const href = this.getAttribute('href');
            if (href && href !== '#' && href !== '') {
                // Solo cerrar menú en móvil
                if (window.innerWidth <= 992) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.classList.remove('active');
                    document.body.style.overflow = '';
                }
                console.log('Navegando a:', href);
                return; // Permitir navegación normal
            }
            
            // Para enlaces internos (sin href o href="#")
            e.preventDefault();
            const action = this.dataset.action;
            
            if (!action) return;
            
            // Cerrar menú en móvil
            if (window.innerWidth <= 992) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
            
            // Actualizar estado activo (solo enlaces internos)
            document.querySelectorAll('.nav-link').forEach(l => {
                // Solo quitar active de enlaces internos
                const lHref = l.getAttribute('href');
                if (!lHref || lHref === '#' || lHref === '') {
                    l.classList.remove('active');
                }
            });
            this.classList.add('active');
            
            handleNavigationAction(action);
        });
    });
    
    // ELIMINA ESTE BLOQUE COMPLETO (ya no es necesario):
    // document.querySelectorAll('.nav-link-externo').forEach(link => { ... });
    
    // Botones de estadísticas
    document.querySelectorAll('.stat-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleNavigationAction(action);
        });
    });
    
    // Acciones rápidas
    document.querySelectorAll('.action-card').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleNavigationAction(action);
        });
    });
    
    // Botones de variación
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

// Configurar búsqueda
function setupSearch() {
    const searchInput = document.getElementById('product-search');
    const searchBtn = document.getElementById('search-btn');
    const suggestions = document.getElementById('suggestions');
    
    if (!searchInput || !searchBtn) {
        console.error('❌ Elementos de búsqueda no encontrados');
        return;
    }
    
    // Buscar al hacer clic
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchProduct(query);
        }
    });
    
    // Buscar con Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchProduct(query);
            }
        }
    });
    
    // Autocompletado
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
                searchProduct(product);
            });
            suggestionsElem.appendChild(div);
        });
        
        suggestionsElem.style.display = 'block';
    });
    
    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (suggestions && 
            !searchInput.contains(e.target) && 
            !suggestions.contains(e.target)) {
            suggestions.innerHTML = '';
            suggestions.style.display = 'none';
        }
    });
}

// Buscar producto
function searchProduct(productName) {
    const query = productName.toLowerCase().trim();
    if (!query) return;
    
    console.log('🔍 Buscando:', query);
    currentSearchTerm = query;
    showLoading('Buscando producto...');
    
    try {
        // Buscar coincidencias EXACTAS
        const exactMatches = productosData.filter(p => 
            p.producto && p.producto.toLowerCase() === query
        );
        
        console.log('📊 Resultados exactos encontrados:', exactMatches.length);
        
        if (exactMatches.length === 0) {
            const startsWithMatches = productosData.filter(p => 
                p.producto && p.producto.toLowerCase().startsWith(query + ' ')
            );
            
            if (startsWithMatches.length > 0) {
                const suggestedProducts = [...new Set(startsWithMatches.map(p => p.producto))].slice(0, 3);
                showError(`Producto no encontrado. ¿Quizás quisiste decir: ${suggestedProducts.join(', ')}?`);
                hideLoading();
                return;
            } else {
                showError('Producto no encontrado');
                hideLoading();
                return;
            }
        }
        
        // Guardar datos actuales para el filtro
        currentProductData = exactMatches;
        
        // Ordenar por fecha
        exactMatches.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        // Actualizar título
        const titleElem = document.getElementById('product-title');
        if (titleElem) {
            titleElem.textContent = exactMatches[0].producto;
        }
        
        // Resetear filtros
        currentFilters = {
            city: 'global',
            supermarket: 'global',
            brand: 'global'
        };
        
        // Mostrar resumen
        updateProductSummary(exactMatches, currentFilters);
        
        // Crear gráfico
        const { ciudades, supermercados, marcas } = createPriceChart(exactMatches, currentFilters);
        
        // Configurar filtros
        setupFilters(exactMatches, ciudades, supermercados, marcas);
        
        // Mostrar detalles
        showBrandDetails(exactMatches);
        
        // Cambiar pantalla
        showScreen('results');
        
        // Actualizar navegación
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const mainNavLink = document.querySelector('[data-action="main"]');
        if (mainNavLink) mainNavLink.classList.add('active');
        
        console.log('✅ Producto mostrado correctamente');
        
    } catch (error) {
        console.error('❌ Error en searchProduct:', error);
        showError('Error al mostrar el producto: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Mostrar todos los productos
function showAllProducts() {
    showScreen('products');
    updateAllProductsList();
    
    // Actualizar navegación
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
            searchProduct(product);
        });
        productsGrid.appendChild(item);
    });
    
    // Configurar filtro de productos
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
    
    // Agrupar por año
    const years = {};
    productosData.forEach(item => {
        if (!item.fecha) return;
        
        // FORMATO: "17/06/2025" -> extraer año (última parte después del /)
        const parts = item.fecha.split('/');
        if (parts.length !== 3) {
            console.warn('Formato de fecha inválido:', item.fecha);
            return;
        }
        
        const year = parts[2]; // "2025" (índice 0: día, 1: mes, 2: año)
        
        if (!years[year]) {
            years[year] = {
                count: 0,
                products: new Set(),
                supermarkets: new Set(),
                cities: new Set()
            };
        }
        years[year].count++;
        years[year].products.add(item.producto);
        if (item.super) years[year].supermarkets.add(item.super);
        if (item.ciudad) years[year].cities.add(item.ciudad);
    });
    
    // Mostrar tarjetas de año
    const yearCards = document.getElementById('year-cards');
    if (yearCards) {
        yearCards.innerHTML = '';
        
        const sortedYears = Object.keys(years).sort().reverse();
        
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
    
    // Crear gráfico de barras
    createYearChart(years);
    
    // Actualizar navegación
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const dateNavLink = document.querySelector('[data-action="by-date"]');
    if (dateNavLink) dateNavLink.classList.add('active');
}

// Función para mostrar resumen de producto
function updateProductSummary(productData, filters = { city: 'global', supermarket: 'global', brand: 'global' }) {
    if (!productData || productData.length === 0) {
        setSummaryPlaceholders();
        return;
    }
    
    // Aplicar filtros a los datos
    let filteredData = productData;
    
    if (filters.city !== 'global') {
        filteredData = filteredData.filter(item => item.ciudad === filters.city);
    }
    
    if (filters.supermarket !== 'global') {
        filteredData = filteredData.filter(item => item.super === filters.supermarket);
    }
    
    if (filters.brand !== 'global') {
        filteredData = filteredData.filter(item => item.marca === filters.brand);
    }
    
    if (filteredData.length === 0) {
        setSummaryPlaceholders();
        return;
    }
    
    // Ordenar por fecha
    filteredData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // PRECIO ACTUAL
    const mostRecentRecord = filteredData[0];
    const currentPrice = mostRecentRecord.precio || 0;
    setElementText('current-price', `${currentPrice.toFixed(2)}€`);
    
    // VARIACIÓN MEDIA
    const groupedVariations = new Map();
    
    filteredData.forEach(item => {
        if (!item.super || !item.marca) return;
        
        const key = `${item.producto}||${item.marca}||${item.super}`;
        
        if (item.variacion_total !== null && item.variacion_total !== undefined && !isNaN(item.variacion_total)) {
            if (!groupedVariations.has(key)) {
                groupedVariations.set(key, {
                    count: 1,
                    total: item.variacion_total
                });
            } else {
                const existing = groupedVariations.get(key);
                groupedVariations.set(key, {
                    count: existing.count + 1,
                    total: existing.total + item.variacion_total
                });
            }
        }
    });
    
    let avgVariation = 0;
    if (groupedVariations.size > 0) {
        let totalVariation = 0;
        let totalGroups = 0;
        
        groupedVariations.forEach(variation => {
            totalVariation += variation.total / variation.count;
            totalGroups++;
        });
        
        avgVariation = totalVariation / totalGroups;
    }
    
    const variationElem = document.getElementById('total-variation');
    if (variationElem) {
        variationElem.textContent = `${avgVariation >= 0 ? '+' : ''}${avgVariation.toFixed(1)}%`;
        variationElem.className = `variation-large ${avgVariation >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Registros
    setElementText('total-records-result', filteredData.length);
    
    // Última fecha
    if (document.getElementById('last-record-date')) {
        try {
            const lastDate = new Date(mostRecentRecord.fecha);
            setElementText('last-record-date', lastDate.toLocaleDateString('es-ES'));
        } catch {
            setElementText('last-record-date', '-');
        }
    }
    
    // Actualizar contextos según filtros
    let contextText = '';
    const activeFilters = [];
    
    if (filters.city !== 'global') activeFilters.push(`Ciudad: ${filters.city}`);
    if (filters.supermarket !== 'global') activeFilters.push(`Super: ${filters.supermarket}`);
    if (filters.brand !== 'global') activeFilters.push(`Marca: ${filters.brand}`);
    
    if (activeFilters.length === 0) {
        contextText = 'Todos los datos';
    } else {
        contextText = activeFilters.join(' | ');
    }
    
    setElementText('current-price-context', contextText);
    setElementText('variation-context', contextText);
    setElementText('records-context', contextText);
    setElementText('date-context', contextText);
}

// Helper para establecer texto de elementos de forma segura
function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// Helper para establecer placeholders en resumen
function setSummaryPlaceholders() {
    const placeholders = {
        'current-price': '-',
        'total-variation': '-',
        'total-records-result': '0',
        'last-record-date': '-',
        'current-price-context': 'Sin datos con filtros',
        'variation-context': 'Sin datos con filtros',
        'records-context': 'Sin datos con filtros',
        'date-context': 'Sin datos con filtros'
    };
    
    for (const [id, text] of Object.entries(placeholders)) {
        setElementText(id, text);
    }
    
    const variationElem = document.getElementById('total-variation');
    if (variationElem) {
        variationElem.className = 'variation-large';
    }
}

// Función para crear gráfico de precios
function createPriceChart(productData, filters = { city: 'global', supermarket: 'global', brand: 'global' }) {
    console.log('📈 Creando gráfico (Marca + Supermercado)');
    
    const canvas = document.getElementById('price-chart');
    if (!canvas) {
        console.error('❌ Canvas no encontrado');
        return { ciudades: [], supermercados: [], marcas: [] };
    }
    
    // Limpiar mensajes de error previos
    const chartContainer = canvas.parentElement.parentElement;
    const existingError = chartContainer.querySelector('.chart-info-message');
    if (existingError) existingError.remove();
    
    // Destruir gráfico anterior
    if (currentChart instanceof Chart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    try {
        // Aplicar filtros a los datos
        let filteredData = productData;
        
        if (filters.city !== 'global') {
            filteredData = filteredData.filter(item => item.ciudad === filters.city);
        }
        
        if (filters.supermarket !== 'global') {
            filteredData = filteredData.filter(item => item.super === filters.supermarket);
        }
        
        if (filters.brand !== 'global') {
            filteredData = filteredData.filter(item => item.marca === filters.brand);
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
                        x: { type: 'time', title: { display: true, text: 'Fecha' } },
                        y: { title: { display: true, text: 'Precio (€)' } }
                    }
                }
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chart-info-message';
            infoDiv.innerHTML = `<p><i class="fas fa-info-circle"></i> No hay datos disponibles con los filtros actuales</p>`;
            chartContainer.appendChild(infoDiv);
            
            return { ciudades: [], supermercados: [], marcas: [] };
        }
        
        // Agrupar por MARCA + SUPERMERCADO
        const groups = {};
        const ciudadesDisponibles = new Set();
        const supermercadosDisponibles = new Set();
        const marcasDisponibles = new Set();
        
        filteredData.forEach(item => {
            if (!item || !item.super) return;
            
            if (item.ciudad) {
                ciudadesDisponibles.add(item.ciudad);
            }
            if (item.super) {
                supermercadosDisponibles.add(item.super);
            }
            if (item.marca) {
                marcasDisponibles.add(item.marca);
            }
            
            const marca = item.marca || 'Sin marca';
            const key = `${marca} | ${item.super}`;
            
            if (!groups[key]) {
                groups[key] = {
                    marca: marca,
                    super: item.super,
                    datos: []
                };
            }
            
            const fecha = new Date(item.fecha);
            if (isNaN(fecha.getTime())) {
                console.warn('Fecha inválida:', item.fecha);
                return;
            }
            
            const precio = item.precio_neto !== undefined ? item.precio_neto : item.precio;
            if (typeof precio !== 'number' || isNaN(precio)) {
                console.warn('Precio inválido:', precio);
                return;
            }
            
            groups[key].datos.push({
                fecha: fecha,
                precio: precio,
                ciudad: item.ciudad || 'Desconocida',
                precio_neto: item.precio_neto
            });
        });
        
        console.log('Combinaciones encontradas (Marca + Super):', Object.keys(groups).length);
        
        // Ordenar cada grupo por fecha
        const validGroups = {};
        for (const [key, group] of Object.entries(groups)) {
            if (group.datos.length > 0) {
                group.datos.sort((a, b) => a.fecha - b.fecha);
                validGroups[key] = group;
            }
        }
        
        // Si no hay grupos válidos
        if (Object.keys(validGroups).length === 0) {
            const ctx = canvas.getContext('2d');
            currentChart = new Chart(ctx, {
                type: 'line',
                data: { datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { type: 'time', title: { display: true, text: 'Fecha' } },
                        y: { title: { display: true, text: 'Precio (€)' } }
                    }
                }
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chart-info-message';
            infoDiv.innerHTML = '<p><i class="fas fa-info-circle"></i> No hay suficientes datos para mostrar líneas en el gráfico</p>';
            chartContainer.appendChild(infoDiv);
            
            return { 
                ciudades: Array.from(ciudadesDisponibles), 
                supermercados: Array.from(supermercadosDisponibles),
                marcas: Array.from(marcasDisponibles)
            };
        }
        
        // Preparar datasets para Chart.js
        const datasets = [];
        const colors = [
            '#4a6fa5', '#6b8e23', '#8b4513', '#2c3e50', '#7d3c98',
            '#16a085', '#e67e22', '#3498db', '#1abc9c', '#9b59b6',
            '#34495e', '#27ae60', '#8e44ad', '#2c3e50', '#f39c12'
        ];
        
        Object.entries(validGroups).forEach(([combinacion, group], index) => {
            const { marca, super: supermercado, datos } = group;
            
            let label = `${marca} (${supermercado})`;
            
            if (datos.length >= 2) {
                const firstPrice = datos[0].precio;
                const lastPrice = datos[datos.length - 1].precio;
                if (firstPrice > 0) {
                    const variacion = ((lastPrice - firstPrice) / firstPrice) * 100;
                    label = `${marca} (${supermercado}) ${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`;
                }
            }
            
            const datasetConfig = {
                label: label,
                data: datos.map(d => ({
                    x: d.fecha,
                    y: d.precio
                })),
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
            };
            
            datasets.push(datasetConfig);
        });
        
        console.log('Datasets preparados:', datasets.length);
        
        // Obtener contexto del canvas
        const ctx = canvas.getContext('2d');
        
        // Configuración del gráfico
        const config = {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 11
                            },
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
                                const label = context[0].dataset.label || '';
                                return label.split(' ').slice(0, -1).join(' ');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            },
                            tooltipFormat: 'dd/MM/yyyy'
                        },
                        title: {
                            display: true,
                            text: 'Fecha',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Precio (€)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2) + '€';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        };
        
        // Crear el gráfico
        currentChart = new Chart(ctx, config);
        
        console.log('✅ Gráfico creado exitosamente');
        
        return { 
            ciudades: Array.from(ciudadesDisponibles), 
            supermercados: Array.from(supermercadosDisponibles),
            marcas: Array.from(marcasDisponibles)
        };
        
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
                    x: { type: 'time', title: { display: true, text: 'Fecha' } },
                    y: { title: { display: true, text: 'Precio (€)' } }
                }
            }
        });
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-info-message';
        errorDiv.innerHTML = `
            <p><i class="fas fa-info-circle"></i> Error al crear el gráfico</p>
            <p><small>Intenta buscar otro producto o cambiar los filtros</small></p>
        `;
        chartContainer.appendChild(errorDiv);
        
        return { ciudades: [], supermercados: [], marcas: [] };
    }
}

// Configurar selectores de filtros
function setupFilters(productData, ciudades, supermercados, marcas) {
    const citySelect = document.getElementById('city-filter');
    const supermarketSelect = document.getElementById('supermarket-filter');
    const brandSelect = document.getElementById('brand-filter');
    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filter');
    
    if (!citySelect || !supermarketSelect || !brandSelect || !applyBtn || !resetBtn) return;
    
    // Actualizar selectores
    updateFilterSelector(citySelect, ciudades, currentFilters.city);
    updateFilterSelector(supermarketSelect, supermercados, currentFilters.supermarket);
    updateFilterSelector(brandSelect, marcas, currentFilters.brand);
    
    // Al aplicar filtros
    applyBtn.addEventListener('click', function() {
        const selectedCity = citySelect.value;
        const selectedSupermarket = supermarketSelect.value;
        const selectedBrand = brandSelect.value;
        
        currentFilters = {
            city: selectedCity,
            supermarket: selectedSupermarket,
            brand: selectedBrand
        };
        
        console.log(`🌍 Aplicando filtros: Ciudad=${selectedCity}, Supermercado=${selectedSupermarket}, Marca=${selectedBrand}`);
        
        showLoading('Aplicando filtros...');
        setTimeout(() => {
            updateProductSummary(productData, currentFilters);
            createPriceChart(productData, currentFilters);
            showBrandDetails(productData, currentFilters);
            hideLoading();
        }, 100);
    });
    
    // Al restablecer
    resetBtn.addEventListener('click', function() {
        citySelect.value = 'global';
        supermarketSelect.value = 'global';
        brandSelect.value = 'global';
        currentFilters = { city: 'global', supermarket: 'global', brand: 'global' };
        
        console.log('🔄 Restableciendo filtros');
        
        showLoading('Restableciendo filtros...');
        setTimeout(() => {
            updateProductSummary(productData, currentFilters);
            createPriceChart(productData, currentFilters);
            showBrandDetails(productData, currentFilters);
            hideLoading();
        }, 100);
    });
}

// Actualizar selector de filtros
function updateFilterSelector(selectElement, options, selectedValue) {
    if (!selectElement) return;
    
    const currentValue = selectElement.value;
    
    // Guardar la primera opción (global)
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
    
    if (options.includes(currentValue)) {
        selectElement.value = currentValue;
    } else {
        selectElement.value = selectedValue;
    }
}

// Mostrar detalles por marca/supermercado
function showBrandDetails(productData, filters = { city: 'global', supermarket: 'global', brand: 'global' }) {
    const container = document.getElementById('brand-details');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!productData || productData.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos de detalles</p>';
        return;
    }
    
    // Aplicar filtros a los datos
    let filteredData = productData;
    
    if (filters.city !== 'global') {
        filteredData = filteredData.filter(item => item.ciudad === filters.city);
    }
    
    if (filters.supermarket !== 'global') {
        filteredData = filteredData.filter(item => item.super === filters.supermarket);
    }
    
    if (filters.brand !== 'global') {
        filteredData = filteredData.filter(item => item.marca === filters.brand);
    }
    
    if (filteredData.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos con los filtros aplicados</p>';
        return;
    }
    
    // Agrupar por MARCA + SUPERMERCADO
    const groups = {};
    filteredData.forEach(item => {
        if (!item || !item.super) return;
        
        const marca = item.marca || 'Sin marca';
        const key = `${marca} | ${item.super}`;
        
        if (!groups[key]) {
            groups[key] = {
                marca: marca,
                super: item.super,
                datos: []
            };
        }
        
        groups[key].datos.push(item);
    });
    
    console.log('Grupos para detalles (Marca + Super):', Object.keys(groups).length);
    
    // Crear tarjetas para cada grupo
    Object.entries(groups).forEach(([combinacion, group]) => {
        if (group.datos.length === 0) return;
        
        group.datos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        const firstItem = group.datos[0];
        const lastItem = group.datos[group.datos.length - 1];
        
        const firstPrice = firstItem.precio_neto !== undefined ? firstItem.precio_neto : firstItem.precio;
        const lastPrice = lastItem.precio_neto !== undefined ? lastItem.precio_neto : lastItem.precio;
        
        let variacion = 0;
        let variacionTexto = 'N/A';
        if (firstPrice > 0 && typeof firstPrice === 'number') {
            variacion = ((lastPrice - firstPrice) / firstPrice) * 100;
            variacionTexto = `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`;
        }
        
        const precioPromedio = group.datos.reduce((sum, item) => {
            const precio = item.precio_neto !== undefined ? item.precio_neto : item.precio;
            return sum + precio;
        }, 0) / group.datos.length;
        
        const card = document.createElement('div');
        card.className = 'brand-card';
        card.innerHTML = `
            <div class="brand-header">
                <h4>${group.marca}</h4>
                <span class="super-badge">${group.super}</span>
            </div>
            <div class="brand-info">
                <div>
                    <small>Primer precio neto</small>
                    <p>${firstPrice.toFixed(2)}€</p>
                    <small class="date">${new Date(firstItem.fecha).toLocaleDateString('es-ES')}</small>
                </div>
                <div>
                    <small>Último precio neto</small>
                    <p>${lastPrice.toFixed(2)}€</p>
                    <small class="date">${new Date(lastItem.fecha).toLocaleDateString('es-ES')}</small>
                </div>
                <div>
                    <small>Variación</small>
                    <p class="${variacion >= 0 ? 'positive' : 'negative'}">${variacionTexto}</p>
                </div>
                <div>
                    <small>Promedio neto</small>
                    <p>${precioPromedio.toFixed(2)}€</p>
                </div>
            </div>
            <div class="brand-meta">
                <span><i class="fas fa-database"></i> ${group.datos.length} registros</span>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    if (container.innerHTML === '') {
        container.innerHTML = '<p class="no-data">No hay datos agrupados con los filtros actuales</p>';
    }
}

// Mostrar análisis de variación
function showVariationAnalysis() {
    showScreen('variation');
    
    // Configurar event listeners para los botones grandes
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
    
    // Mostrar subidas por defecto
    showTopVariations('increases');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const variationNavLink = document.querySelector('[data-action="variation-analysis"]');
    if (variationNavLink) variationNavLink.classList.add('active');
}

// Mostrar top productos con variación
function showTopVariations(type) {
    showLoading('Calculando variaciones...');
    
    // Agrupar por producto, marca y supermercado, tomando el MÁS RECIENTE de cada uno
    const latestProducts = new Map();
    
    productosData.forEach(item => {
        if (!item.producto || !item.super) return;
        
        const key = `${item.producto}||${item.marca || 'Sin marca'}||${item.super}`;
        const currentDate = new Date(item.fecha);
        
        if (!latestProducts.has(key) || currentDate > latestProducts.get(key).fecha) {
            latestProducts.set(key, {
                fecha: currentDate,
                producto: item.producto,
                marca: item.marca || 'Sin marca',
                super: item.super,
                variacion_total: item.variacion_total || 0
            });
        }
    });
    
    // Convertir a array y filtrar productos con variación
    const productsWithVariation = Array.from(latestProducts.values())
        .filter(item => item.variacion_total !== null && item.variacion_total !== 0);
    
    // Ordenar
    if (type === 'increases') {
        productsWithVariation.sort((a, b) => b.variacion_total - a.variacion_total);
        const titleElem = document.querySelector('#variation-screen .screen-title h2');
        if (titleElem) titleElem.textContent = 'Mayores Subidas';
    } else {
        productsWithVariation.sort((a, b) => a.variacion_total - b.variacion_total);
        const titleElem = document.querySelector('#variation-screen .screen-title h2');
        if (titleElem) titleElem.textContent = 'Mayores Bajadas';
    }
    
    // Mostrar top 15
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
                        <small>Última actualización: ${new Date(item.fecha).toLocaleDateString('es-ES')}</small>
                    </div>
                    <button class="view-btn" onclick="searchProduct('${item.producto.replace(/'/g, "\\'")}')">
                        <i class="fas fa-chart-line"></i>
                    </button>
                `;
                container.appendChild(itemElement);
            });
        }
    }
    
    // Activar tab correspondiente
    document.querySelectorAll('#variation-screen .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === type) {
            btn.classList.add('active');
        }
    });
    
    hideLoading();
}

// Mostrar análisis de inflación
function showInflationAnalysis() {
    showScreen('inflation');
    updateInflationStats();
    
    // Configurar event listeners para filtros
    const cityFilter = document.getElementById('city-inflation-filter');
    const yearFilter = document.getElementById('year-inflation-filter');
    
    if (cityFilter) {
        updateFilterSelector(cityFilter, Array.from(cities), 'global');
        cityFilter.addEventListener('change', updateInflationStats);
    }
    
    if (yearFilter) {
        // Limpiar opciones existentes
        while (yearFilter.options.length > 1) {
            yearFilter.remove(1);
        }
        
        // Añadir opción para cada año disponible dinámicamente
        const sortedYears = Array.from(availableYears).sort();
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `Año ${year}`;
            yearFilter.appendChild(option);
        });
        
        yearFilter.addEventListener('change', updateInflationStats);
    }
    
    // Actualizar navegación
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
    
    // Filtrar por ciudad si es necesario
    let filteredData = productosData;
    if (selectedCity !== 'global') {
        filteredData = filteredData.filter(item => item.ciudad === selectedCity);
    }
    
    let result = null;
    let excludedProducts = 0;
    let totalCombinations = 0;
    
    if (selectedYear === 'total') {
        // CÁLCULO PARA INFLACIÓN TOTAL
        // Requisito: ≥3 registros en total por combinación
        const combinationCounts = new Map();
        
        // Contar registros totales por combinación
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            
            const key = `${item.producto}||${item.super}||${item.marca}`;
            combinationCounts.set(key, (combinationCounts.get(key) || 0) + 1);
        });
        
        totalCombinations = combinationCounts.size;
        
        // Filtrar solo combinaciones con ≥3 registros TOTALES
        const validCombinations = new Set();
        combinationCounts.forEach((count, key) => {
            if (count > 2) {  // count > 2 es equivalente a count >= 3
                validCombinations.add(key);
            } else {
                excludedProducts++;
            }
        });
        
        // Obtener la variación más reciente de cada combinación válida
        const latestVariations = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            
            const key = `${item.producto}||${item.super}||${item.marca}`;
            
            // Solo procesar combinaciones válidas (≥3 registros totales)
            if (!validCombinations.has(key)) return;
            
            // Solo si tiene variacion_total
            if (item.variacion_total === null || item.variacion_total === undefined) return;
            
            const currentDate = new Date(item.fecha);
            
            // Tomar el registro más reciente
            if (!latestVariations.has(key) || currentDate > latestVariations.get(key).fecha) {
                latestVariations.set(key, {
                    fecha: currentDate,
                    variacion: item.variacion_total
                });
            }
        });
        
        const validVariations = Array.from(latestVariations.values()).map(v => v.variacion);
        const validProductsCount = latestVariations.size;
        
        result = {
            title: 'Inflación Total',
            description: 'Variación media de precios (solo productos con ≥3 registros totales)',
            inflation: validVariations.length > 0 ? 
                validVariations.reduce((a, b) => a + b, 0) / validVariations.length : 0,
            productCount: validProductsCount,
            recordCount: validVariations.length,
            excludedCount: excludedProducts,
            totalCombinations: totalCombinations,
            year: 'Total'
        };
        
    } else {
        // CÁLCULO PARA AÑO ESPECÍFICO (ej: 2025)
        // Requisito: ≥3 registros en ESE AÑO específico
        const yearField = `variacion_${selectedYear}`;
        
        // Contar registros del año específico por combinación
        const combinationYearCounts = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            
            // Verificar que sea del año correcto
            const itemYear = new Date(item.fecha).getFullYear().toString();
            if (itemYear !== selectedYear) return;
            
            // Verificar que tenga variación para este año
            if (item[yearField] === null || item[yearField] === undefined) return;
            
            const key = `${item.producto}||${item.super}||${item.marca}`;
            combinationYearCounts.set(key, (combinationYearCounts.get(key) || 0) + 1);
        });
        
        totalCombinations = combinationYearCounts.size;
        
        // Filtrar solo combinaciones con ≥3 registros en ESTE AÑO
        const validCombinations = new Set();
        combinationYearCounts.forEach((count, key) => {
            if (count > 2) {  // count > 2 es equivalente a count >= 3
                validCombinations.add(key);
            } else {
                excludedProducts++;
            }
        });
        
        // Obtener la variación más reciente de cada combinación válida PARA ESTE AÑO
        const latestVariations = new Map();
        
        filteredData.forEach(item => {
            if (!item.producto || !item.super || !item.marca) return;
            
            // Verificar que sea del año correcto
            const itemYear = new Date(item.fecha).getFullYear().toString();
            if (itemYear !== selectedYear) return;
            
            const key = `${item.producto}||${item.super}||${item.marca}`;
            
            // Solo procesar combinaciones válidas (≥3 registros en este año)
            if (!validCombinations.has(key)) return;
            
            // Solo si tiene variación para este año
            if (item[yearField] === null || item[yearField] === undefined) return;
            
            const currentDate = new Date(item.fecha);
            
            // Tomar el registro más reciente
            if (!latestVariations.has(key) || currentDate > latestVariations.get(key).fecha) {
                latestVariations.set(key, {
                    fecha: currentDate,
                    variacion: item[yearField]
                });
            }
        });
        
        const validVariations = Array.from(latestVariations.values()).map(v => v.variacion);
        const validProductsCount = latestVariations.size;
        
        result = {
            title: `Inflación ${selectedYear}`,
            description: `Variación media durante el año ${selectedYear} (solo productos con ≥3 registros en ${selectedYear})`,
            inflation: validVariations.length > 0 ? 
                validVariations.reduce((a, b) => a + b, 0) / validVariations.length : 0,
            productCount: validProductsCount,
            recordCount: validVariations.length,
            excludedCount: excludedProducts,
            totalCombinations: totalCombinations,
            year: selectedYear
        };
    }
    
    // Mostrar resultados (MANTIENE EL MISMO HTML QUE TU VERSIÓN ORIGINAL)
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
                ${result.excludedCount > 0 ? 
                    `<br><small class="excluded-info">
                        <i class="fas fa-filter"></i> 
                        ${result.excludedCount} productos excluidos (menos de 3 registros)
                    </small>` : ''
                }
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
                ${result.totalCombinations > 0 ? 
                    `<br><small>De ${result.totalCombinations} combinaciones totales</small>` : ''
                }
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

// Mostrar filtros (pantalla separada)
function showFilterScreen(filterType, options) {
    const container = document.getElementById('filter-options');
    const results = document.getElementById('filter-results');
    
    if (!container || !results) return;
    
    container.innerHTML = '';
    results.innerHTML = '';
    
    if (filterType === 'supermarket') {
        document.getElementById('filter-title').textContent = 'Filtrar por Supermercado';
    } else if (filterType === 'city') {
        document.getElementById('filter-title').textContent = 'Filtrar por Ciudad';
    } else if (filterType === 'brand') {
        document.getElementById('filter-title').textContent = 'Filtrar por Marca';
    }
    
    // Crear botones de opciones
    options.forEach(option => {
        if (!option) return;
        
        const button = document.createElement('button');
        button.className = 'filter-option';
        button.innerHTML = `<i class="fas fa-${filterType === 'supermarket' ? 'store' : filterType === 'city' ? 'city' : 'tag'}"></i> ${option}`;
        button.addEventListener('click', () => {
            showFilterResults(filterType, option);
        });
        container.appendChild(button);
    });
    
    showScreen('filter');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const filterNavLink = document.querySelector(`[data-action="by-${filterType}"]`);
    if (filterNavLink) filterNavLink.classList.add('active');
}

// Mostrar resultados de filtro (pantalla separada)
function showFilterResults(filterType, value) {
    const results = document.getElementById('filter-results');
    if (!results) return;
    
    // Filtrar datos
    let filteredData;
    if (filterType === 'supermarket') {
        filteredData = productosData.filter(p => p.super === value);
    } else if (filterType === 'city') {
        filteredData = productosData.filter(p => p.ciudad === value);
    } else if (filterType === 'brand') {
        filteredData = productosData.filter(p => p.marca === value);
    }
    
    // Productos únicos en este filtro
    const uniqueProductsInFilter = [...new Set(filteredData.map(p => p.producto))];
    
    // Mostrar resultados
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
                <p>${
                    filteredData.length > 0 ? 
                    new Date(Math.min(...filteredData.map(p => new Date(p.fecha)))).toLocaleDateString('es-ES') + 
                    ' - ' + 
                    new Date(Math.max(...filteredData.map(p => new Date(p.fecha)))).toLocaleDateString('es-ES') 
                    : '-'
                }</p>
            </div>
        </div>
        <div class="filter-products">
            <h4>Productos principales:</h4>
            ${uniqueProductsInFilter.slice(0, 10).map(product => `
                <div class="filter-product-item">
                    <span>${product}</span>
                    <button onclick="searchProduct('${product.replace(/'/g, "\\'")}')">
                        <i class="fas fa-chart-line"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// Event Listeners adicionales
function initEventListeners() {
    // Botones de volver
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const backTo = this.dataset.back || 'main';
            showScreen(backTo);
            
            // Actualizar navegación
            if (backTo === 'main') {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                const mainNavLink = document.querySelector('[data-action="main"]');
                if (mainNavLink) mainNavLink.classList.add('active');
            }
        });
    });
    
    // Tabs en pantalla de variación
    document.querySelectorAll('#variation-screen .tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            
            // Actualizar tabs activos
            document.querySelectorAll('#variation-screen .tab-btn').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar contenido
            if (tabType === 'increases') {
                showTopVariations('increases');
            } else {
                showTopVariations('decreases');
            }
        });
    });
    setupAdditionalElements();
}

// Mostrar/ocultar pantallas
function showScreen(screenName) {
    // Cerrar menú en móvil
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Ocultar todas las pantallas
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    
    // Mostrar pantalla solicitada
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

// Utilidades
function showLoading(message = 'Cargando...') {
    const loading = document.getElementById('loading');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loading) {
        if (loadingMessage && message) {
            loadingMessage.textContent = message;
        }
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
        
        setTimeout(() => {
            errorToast.classList.add('hidden');
        }, 5000);
    } else {
        alert(message);
    }
}

// Hacer funciones disponibles globalmente
window.searchProduct = searchProduct;
window.hideError = hideError;

// Función para debug
window.debugProduct = function(productName) {
    const exactMatches = productosData.filter(p => 
        p.producto && p.producto.toLowerCase() === productName.toLowerCase()
    );
    
    console.log('=== DEBUG PRODUCTO ===');
    console.log('Producto buscado:', productName);
    console.log('Coincidencias exactas:', exactMatches.length);
    
    const partialMatches = productosData.filter(p => 
        p.producto && p.producto.toLowerCase().includes(productName.toLowerCase())
    );
    console.log('Coincidencias parciales:', partialMatches.length);
    
    const groups = {};
    exactMatches.forEach(item => {
        const key = item.super || 'Sin supermercado';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    
    console.log('Por supermercado:');
    Object.entries(groups).forEach(([superName, items]) => {
        console.log(`  ${superName}: ${items.length} registros`);
        items.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        console.log(`    Fechas: ${items[0].fecha} → ${items[items.length-1].fecha}`);
        console.log(`    Precios: ${items[0].precio} → ${items[items.length-1].precio}`);
        console.log(`    Precios netos: ${items[0].precio_neto} → ${items[items.length-1].precio_neto}`);
    });
    
    return exactMatches;

};



