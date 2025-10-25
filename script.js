// Configurações da API
const API_BASE_URL = 'https://api.cnpja.com/office';
const API_KEY = 'e3eba6c7-ceee-42b8-99b9-2565102a6bc3-44d3856b-603a-4d0c-9a28-a57dbfd43724';

// Elementos do DOM
const searchForm = document.getElementById('searchForm');
const dataInicio = document.getElementById('dataInicio');
const dataFim = document.getElementById('dataFim');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const debugInfo = document.getElementById('debugInfo');
const requestUrlSpan = document.getElementById('requestUrl');
const apiResponseSpan = document.getElementById('apiResponse');
const resultsContainer = document.getElementById('resultsContainer');
const noResults = document.getElementById('noResults');
const tableBody = document.getElementById('tableBody');
const resultCount = document.getElementById('resultCount');
const btnSearch = document.querySelector('.btn-search');

// Event Listeners
searchForm.addEventListener('submit', handleSearch);

// Função principal de busca
async function handleSearch(e) {
    e.preventDefault();

    // Validação de datas
    const inicio = new Date(dataInicio.value);
    const fim = new Date(dataFim.value);

    if (inicio > fim) {
        showError('A data de início não pode ser maior que a data de fim.');
        return;
    }

    // Limpar resultados anteriores
    clearResults();
    
    // Ocultar debug
    debugInfo.classList.add('hidden');

    // Mostrar spinner de carregamento
    showLoading(true);
    btnSearch.disabled = true;

    try {
        // Formatar datas para ISO 8601
        const dataInicioISO = dataInicio.value;
        const dataFimISO = dataFim.value;

        // Construir URL com parâmetros
        const params = new URLSearchParams({
            'founded.gte': dataInicioISO,
            'founded.lte': dataFimISO,
            'company.simei.optant.eq': 'true', // Filtro MEI reativado
            'limit': '5'
        });

        const url = `${API_BASE_URL}?${params.toString()}`;
        requestUrlSpan.textContent = url;
        debugInfo.classList.remove('hidden');

        // Fazer requisição à API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            apiResponseSpan.textContent = `Status: ${response.status}. Resposta: ${errorText}`;
            throw new Error(`Erro na API: ${response.status} - ${response.statusText}. Detalhes no console e na seção de debug.`);
        }

        const data = await response.json();
        apiResponseSpan.textContent = JSON.stringify(data, null, 2).substring(0, 500) + '...'; // Limita o tamanho do log

        // Processar resultados
        // A API CNPJjá retorna o array de resultados na chave 'records'
        if (data.records && data.records.length > 0) {
            displayResults(data.records);
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        showError(`Erro ao buscar dados: ${error.message}`);
    } finally {
        showLoading(false);
        btnSearch.disabled = false;
    }
}

// Função para exibir resultados
function displayResults(results) {
    // Limpar tabela
    tableBody.innerHTML = '';

    // Adicionar linhas à tabela
    results.forEach((empresa, index) => {
        const row = document.createElement('tr');
        
        // Extrair dados
        const cnpj = empresa.taxId || 'N/A';
        const razaoSocial = empresa.company?.name || 'N/A';
        // CORREÇÃO: Tentando extrair o email dos campos mais prováveis (empresa.email, empresa.company.email, empresa.contact.email)
        const email = empresa.email || empresa.company?.email || empresa.contact?.email || 'N/A';
        const dataAbertura = formatarData(empresa.founded);
        const status = empresa.status?.text || 'N/A';
        const statusClass = status === 'Ativa' ? 'status-active' : 'status-inactive';

        row.innerHTML = `
            <td><strong>${formatarCNPJ(cnpj)}</strong></td>
            <td>${razaoSocial}</td>
            <td><a href="mailto:${email}">${email}</a></td>
            <td>${dataAbertura}</td>
            <td><span class="${statusClass}">${status}</span></td>
        `;

        tableBody.appendChild(row);
    });

    // Atualizar contagem de resultados
    resultCount.textContent = `${results.length} empresa(s) encontrada(s)`;

    // Mostrar container de resultados
    resultsContainer.classList.remove('hidden');
    noResults.classList.add('hidden');
    debugInfo.classList.add('hidden'); // Oculta a seção de debug após o sucesso
}

// Função para exibir mensagem de nenhum resultado
function showNoResults() {
    resultsContainer.classList.add('hidden');
    noResults.classList.remove('hidden');
}

// Função para exibir erro
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Função para limpar resultados
function clearResults() {
    tableBody.innerHTML = '';
    errorMessage.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    noResults.classList.add('hidden');
    debugInfo.classList.add('hidden');
}

// Função para mostrar/ocultar spinner
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

// Função para formatar CNPJ
function formatarCNPJ(cnpj) {
    if (!cnpj || cnpj === 'N/A') return cnpj;
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return cnpj;
    return `${cnpjLimpo.substring(0, 2)}.${cnpjLimpo.substring(2, 5)}.${cnpjLimpo.substring(5, 8)}/${cnpjLimpo.substring(8, 12)}-${cnpjLimpo.substring(12)}`;
}

// Função para formatar data
function formatarData(data) {
    if (!data || data === 'N/A') return data;
    try {
        const date = new Date(data);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return data;
    }
}

// Definir data padrão (últimos 30 dias)
function setDefaultDates() {
    const hoje = new Date();
    // Define o período padrão para os últimos 6 meses (aprox. 180 dias)
    const seisMeses = new Date(hoje.getTime() - 180 * 24 * 60 * 60 * 1000);

    dataFim.value = hoje.toISOString().split('T')[0];
    dataInicio.value = seisMeses.toISOString().split('T')[0];
}

// Inicializar com datas padrão
setDefaultDates();

