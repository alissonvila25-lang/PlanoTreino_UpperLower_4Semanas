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
python scripts/fetch_commons_images.py

# Fallback/alternativa via Openverse
python scripts/fetch_openverse_images.py
```

O script:
- Lê `plano-4-semanas.csv` para obter os nomes dos exercícios, gera os `slugs` equivalentes e verifica quais não têm imagem local.
- Busca no Wikimedia Commons (termo: "<exercício> exercício academia"), baixa a miniatura de até ~1200px e salva em `app/images/<slug>.jpg|.png`.
- Atualiza `app/image_credits.json` com título, autor e licença.

Observações:
- As imagens baixadas são de licença livre (Commons). Evitamos conteúdo com direitos autorais restritos (Google Images tradicional, etc.).
- Após baixar novas imagens, o Service Worker fará cache quando forem carregadas; não é necessário precache manual.
 - Os créditos e licenças ficam registrados em `app/image_credits.json`.

## Checklist de bump de versão
Para garantir que o app atualize corretamente (cache bust e SW), siga estes passos ao mudar de versão:

## Publicação em GitHub Pages (app2)
Mantemos a publicação em `app2/` e sempre um backup da última versão.

### Script de publicação com backup
Na raiz do projeto, execute:

```powershell
# Publica de app/ para app2/ e cria backup app2-backup-YYYYMMDD-HHmmss/
.\scripts\publish_app2.ps1

# Opcional: mensagem de commit customizada
.\scripts\publish_app2.ps1 -CommitMessage "deploy: app2 v30"

# Opcional: pular atualização automática de app2-stable/
.\scripts\publish_app2.ps1 -SkipStable
```

O script:
- Cria um backup da pasta `app2/` atual: `app2-backup-YYYYMMDD-HHmmss/`.
- Espelha o conteúdo de `app/` para `app2/` (remove o antigo e copia o novo).
- Atualiza automaticamente `app2-stable/` a partir de `app2/`, com backup em `app2-stable-backup-YYYYMMDD-HHmmss/` (desative com `-SkipStable`).
- Roda `git add`, `git commit` e `git push` automaticamente (desative com `-NoGit`).

### Publicação manual (sem script)

```powershell
# 1) Backup da versão atual
Copy-Item app2 app2-backup-$(Get-Date -Format "yyyyMMdd-HHmmss") -Recurse -Force

# 2) Limpar destino e copiar a partir de app/
Remove-Item app2 -Recurse -Force
mkdir app2 | Out-Null
Copy-Item app/* app2 -Recurse -Force

# 3) Commit e push
git add app2 app2-backup-*
git commit -m "deploy: app2 v30"
git push
```

Após o push no branch configurado do Pages, o site estará disponível em:
https://alissonvila25-lang.github.io/PlanoTreino_UpperLower_4Semanas/app2/
