# Frontend

Frontend moderno em React para o sistema de monitoramento de computadores.

## 🚀 Tecnologias

- React 18
- Vite
- TailwindCSS
- React Router DOM
- Recharts (gráficos)
- Axios
- Lucide React (ícones)

## 📦 Estrutura

```
frontend/
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── Layout.jsx
│   │   ├── StatCard.jsx
│   │   ├── ActivityTable.jsx
│   │   ├── ActivityChart.jsx
│   │   ├── FilterBar.jsx
│   │   └── Pagination.jsx
│   ├── pages/             # Páginas da aplicação
│   │   ├── Dashboard.jsx
│   │   ├── Activities.jsx
│   │   ├── Computers.jsx
│   │   └── Stats.jsx
│   ├── services/          # Serviços de API
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── Dockerfile
├── package.json
└── vite.config.js
```

## 🎨 Funcionalidades

### Dashboard
- Visão geral com cards de estatísticas
- Gráfico de tempo de uso por aplicativo
- Lista de atividades recentes

### Atividades
- Listagem completa de todas as atividades
- Filtros por hostname, usuário, aplicativo e data
- Paginação
- Exibição de duração formatada

### Computadores
- Grid de computadores monitorados
- Status em tempo real (ativo/inativo/offline)
- Filtros por status
- Informações do sistema operacional

### Estatísticas
- Gráficos de tempo ativo por usuário
- Gráficos de aplicativos utilizados
- Filtros de período
- Tabela detalhada de métricas

## 🔧 Desenvolvimento Local

### Sem Docker

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:3000

### Com Docker

```bash
# Na raiz do projeto
docker-compose up -d frontend
```

## 🐳 Build de Produção

O Dockerfile usa build multi-stage:
1. Build da aplicação com Node
2. Serve com Nginx

```bash
docker build -t pcmon-frontend ./frontend
docker run -p 3000:80 pcmon-frontend
```

## 🔗 Integração com API

A conexão com a API está configurada em `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

Para produção, ajuste a URL base conforme necessário.

## 🎨 Personalização

### Cores

As cores do tema estão definidas em `tailwind.config.js`:

```javascript
colors: {
  primary: {
    500: '#0ea5e9',  // Azul principal
    600: '#0284c7',  // Azul escuro
    // ...
  }
}
```

### Layout

O layout principal está em `src/components/Layout.jsx` e inclui:
- Sidebar fixa com navegação
- Área de conteúdo principal
- Responsivo

## 📱 Responsividade

O frontend é totalmente responsivo com breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🐛 Troubleshooting

### Erro de CORS
Se houver erro de CORS, certifique-se de que o backend está com os headers CORS configurados corretamente.

### API não responde
Verifique se o container da API está rodando:
```bash
docker ps
curl http://localhost:8080/api/health
```

### Estilos não carregam
Execute o build novamente:
```bash
npm run build
```
