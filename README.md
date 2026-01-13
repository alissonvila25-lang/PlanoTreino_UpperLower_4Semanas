# Plano Upper/Lower · 4 Semanas (GER10–GER14)

Arquivos:

Como importar (Google Sheets):
1) Drive → Novo → Planilha → Arquivo → Importar → Upload → selecione o CSV.
2) Escolha “Inserir nova planilha”. Repita para tecnicas.csv.

Como importar (Excel):
1) Abra o Excel → Dados → De Texto/CSV → selecione o arquivo.
2) Delimitador vírgula. Confirme a importação.

Uso:

Foco semanal:

Dicas rápidas:

## Deploy estático (Netlify)
- Os CSVs foram copiados para dentro de `app/` para que o site funcione com `app/` como raiz.
- Arquivo `netlify.toml` incluído com `publish = "app"` e fallback de SPA para `index.html`.

### Passos
1. Crie uma conta no Netlify.
2. Faça deploy via Git (importar o repositório) ou Drag-and-drop:
	- Zippe a pasta `app/` ou selecione a pasta `app/` no Netlify Drop.
3. Após o deploy, acesse a URL HTTPS gerada e instale a PWA no celular.

## Observações
- A PWA funciona offline após a primeira visita (CSV e imagens locais são cacheados).
- Se usar Cloudflare Tunnel local, a URL pública só funciona enquanto o PC estiver ligado e o túnel ativo.

## Deploy estático (GitHub Pages)
- Incluído workflow em `.github/workflows/pages.yml` que publica o conteúdo de `app/` no GitHub Pages.
- Adicionado `app/.nojekyll` para evitar processamento do Jekyll.

### Passos
1. Crie um repositório no GitHub e faça `git push` da pasta do projeto (branch `main`).
2. A aba “Actions” rodará o workflow e criará o deploy.
3. Em “Settings → Pages”, a URL aparecerá após o primeiro deploy (formato `https://<usuario>.github.io/<repositorio>/`).
4. Abra no celular e instale a PWA.

## Deploy estático (Vercel)
- Arquivo `vercel.json` incluído para publicar `app/` como site estático e aplicar fallback SPA para `index.html`.
- Basta importar o projeto no Vercel; a URL fixa será gerada (HTTPS).
