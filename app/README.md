# App PWA – Plano Upper/Lower (4 Semanas)

Este é um app web instalável (PWA) que lê os CSVs do projeto, mostra o treino por dia/semana, salva seu progresso localmente e funciona offline após o primeiro uso.

## Estrutura
- Página principal: app/index.html
- Lógica/UI: app/app.js, app/style.css
- PWA: app/manifest.webmanifest, app/sw.js
- Dados: plano-4-semanas.csv, tecnicas.csv (raiz do projeto)

## Executar localmente (Windows)
Escolha uma das opções:

1) VS Code + Live Server (recomendado)
- Abra a pasta do projeto no VS Code.
- Se tiver a extensão Live Server, clique em "Go Live" e acesse a URL no navegador.
- Acesse /app/ (ex.: http://127.0.0.1:5500/app/)

2) Python (se instalado)
```powershell
# Na raiz do projeto (onde está a pasta app/)
python -m http.server 5173
# Depois abra: http://127.0.0.1:5173/app/
```

3) Node (npx serve)
```powershell
# Na raiz do projeto
npx serve app -p 5173
# Depois abra: http://127.0.0.1:5173
```

## Usar no celular
- Conecte o celular e o computador na mesma rede Wi‑Fi.
- Descubra o IP do PC (PowerShell: `ipconfig` → IPv4 Address).
- Acesse no celular o endereço: http://IP_DO_PC:PORTA/app/ (ex.: http://192.168.0.10:5173/app/)
- No navegador do celular, use “Adicionar à tela inicial” (instalar PWA).

## Dicas
- O app funciona offline após o primeiro carregamento (cache via Service Worker).
- O progresso (carga, reps, concluído) fica salvo apenas no dispositivo (LocalStorage). Use “Exportar progresso (CSV)” para backup.
- Se os acentos dos CSVs aparecerem estranhos, podemos converter os arquivos para UTF‑8. Peça para eu aplicar a correção.

## Funcionalidades
- Filtro por dia (Segunda, Terça, Quinta, Sábado) e seleção de semana (1–4).
- Visualiza GER/Protocolo/Séries/Pausa/Notas de cada exercício.
- Entrada de Carga/Reps por semana com placeholder vindo do CSV.
- Marcar exercício concluído e ver o Resumo por dia.
- Glossário de técnicas carregado de tecnicas.csv.
- Exportação do progresso em CSV e limpeza total do progresso.

## Imagens dos exercícios (licenças livres)
- As imagens locais ficam em `app/images/` e são usadas por nome com `slug` (ex.: `supino-reto-smith.webp/png/jpg`).
- Para exercícios sem imagem, há um script que tenta baixar fotos do Wikimedia Commons com licença livre e grava os créditos em `app/image_credits.json`.
 - Alternativa: script usando Openverse (catálogo CC) para buscar imagens livres quando não houver resultado no Commons.

Como usar (Windows):

```powershell
# Instalar dependências do script
pip install requests

# Rodar o coletor (na raiz do projeto)
python app/scripts/fetch_commons_images.py

# Fallback/alternativa via Openverse
python app/scripts/fetch_openverse_images.py
```

O script:
- Lê `plano-4-semanas.csv` para obter os nomes dos exercícios, gera os `slugs` equivalentes e verifica quais não têm imagem local.
- Busca no Wikimedia Commons (termo: "<exercício> exercício academia"), baixa a miniatura de até ~1200px e salva em `app/images/<slug>.jpg|.png`.
- Atualiza `app/image_credits.json` com título, autor e licença.

Observações:
- As imagens baixadas são de licença livre (Commons). Evitamos conteúdo com direitos autorais restritos (Google Images tradicional, etc.).
- Após baixar novas imagens, o Service Worker fará cache quando forem carregadas; não é necessário precache manual.
 - Os créditos e licenças ficam registrados em `app/image_credits.json`.
