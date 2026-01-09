# Guia de Contribuição

Obrigado por considerar contribuir para o Licitafacil! 🎉

## 🔄 Workflow de Desenvolvimento

### 1. Configuração Inicial

```bash
# Clone o repositório
git clone <repository-url>
cd licitafacil

# Instale as dependências
pnpm install
```

### 2. Criando uma Branch

```bash
# Crie uma branch a partir da main
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-fix
```

### 3. Desenvolvimento

```bash
# Inicie o ambiente de desenvolvimento
pnpm dev

# Em outro terminal, rode os checks
pnpm typecheck
pnpm lint
```

### 4. Commits

Siga o padrão de commits convencionais:

```
feat: adiciona nova funcionalidade
fix: corrige um bug
docs: atualiza documentação
style: formatação, ponto e vírgula, etc
refactor: refatoração de código
test: adiciona ou corrige testes
chore: atualização de build, configs, etc
```

### 5. Pull Request

1. Certifique-se de que todos os checks passam:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

2. Faça push da sua branch:
   ```bash
   git push origin feature/nome-da-feature
   ```

3. Abra um Pull Request no GitHub
4. Preencha o template de PR com todas as informações necessárias
5. Aguarde review

## 📁 Estrutura de Código

### Adicionando um Novo Package

1. Crie a pasta em `packages/`
2. Adicione `package.json` com nome `@licitafacil/nome-do-package`
3. Configure TypeScript estendendo `@licitafacil/config/tsconfig.base.json`
4. Adicione scripts de build/lint/typecheck

### Adicionando uma Nova App

1. Crie a pasta em `apps/`
2. Configure seguindo o padrão das apps existentes
3. Adicione scripts no `turbo.json` se necessário

## 🧪 Testes

```bash
# Rodar todos os testes
pnpm test

# Rodar testes de um workspace específico
pnpm --filter @licitafacil/web test
```

## 💡 Boas Práticas

- ✅ Use TypeScript strict mode
- ✅ Valide dados com Zod
- ✅ Mantenha componentes pequenos e reutilizáveis
- ✅ Escreva código autoexplicativo
- ✅ Adicione testes para novas funcionalidades
- ✅ Documente decisões arquiteturais importantes

## 🤝 Code Review

- Seja respeitoso e construtivo
- Foque no código, não na pessoa
- Explique o "porquê" das suas sugestões
- Aprove quando estiver satisfeito

## ❓ Dúvidas?

Abra uma issue com a tag `question` ou entre em contato com a equipe.

