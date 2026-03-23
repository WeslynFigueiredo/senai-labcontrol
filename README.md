# 🛠️ Controle Lab's \| SENAI Macapá (DR-AP)

Sistema profissional de **gestão de inventário e controle de ativos**
desenvolvido para os laboratórios do **SENAI Macapá -- DR-AP**.\
A ferramenta tem como foco a **auditoria técnica**, **controle de
estoque crítico** e **geração de relatórios executivos**, oferecendo
suporte estratégico à tomada de decisão institucional.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

------------------------------------------------------------------------

## 📸 Demonstração do Sistema

  ---------------------------------------------------------------------------------------
            Dashboard Operacional                       Inventário e Filtros
  ----------------------------------------- ---------------------------------------------
                 ![Dashboard                                ![Inventário
   Geral](public/screenshot-dashboard.png)   Filtrado](public/screenshot-inventario.png)

   *Visão em tempo real do volume total de     *Gestão de inventário com padronização
     unidades e saúde dos laboratórios.*         automática e filtros inteligentes.*
  ---------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------
             Cadastro de Ativos                 Relatório Executivo (PDF)
  ---------------------------------------- -----------------------------------
                  ![Modal                              ![Relatório
   Cadastro](public/screenshot-modal.png)    PDF](public/screenshot-pdf.png)

    *Interface intuitiva com controle de       *Documento oficial com logo
              estoque mínimo.*                   institucional e área de
                                                      assinatura.*
  ----------------------------------------------------------------------------

------------------------------------------------------------------------

## 🚀 Funcionalidades Principais

### 📊 Dashboard Inteligente

Diferente de sistemas comuns de listagem, o sistema calcula o **volume
real de ativos** utilizando métodos como `reduce`, permitindo saber
exatamente quantas unidades físicas existem no patrimônio (ex: 87
computadores).

### ✨ Padronização Automática de Dados

Independente de como o usuário digita, o sistema aplica **capitalização
automática** em nomes e categorias, mantendo o banco de dados organizado
e padronizado.

### 🔄 Sincronização em Tempo Real

Integração com **Firebase Cloud Firestore**, garantindo que qualquer
alteração no inventário seja refletida instantaneamente para todos os
usuários conectados.

### 📄 Relatórios Executivos em PDF

Geração de relatórios institucionais prontos para auditoria e
documentação:

-   Relatório **Geral** ou **Filtrado por Laboratório**
-   Cards de resumo com status do inventário
-   Tabela consolidada por categoria
-   Logo institucional centralizado (SENAI DR-AP)
-   Data automática de emissão
-   Área de assinatura do responsável técnico/instrutor

### 🛡️ Regras de Integridade de Dados

Sistema possui validações que impedem:

-   Exclusão de laboratórios que possuem ativos vinculados
-   Exclusão de categorias ainda utilizadas
-   Inconsistências estruturais no banco de dados

------------------------------------------------------------------------

## 🛠️ Tecnologias Utilizadas

  Tecnologia               Finalidade
  ------------------------ -------------------------------------------
  **React.js**             Interface dinâmica baseada em componentes
  **Tailwind CSS**         Estilização moderna e responsiva
  **Lucide React**         Biblioteca de ícones
  **Firebase Firestore**   Banco de dados NoSQL em tempo real
  **jsPDF**                Geração de documentos PDF
  **jsPDF-AutoTable**      Criação de tabelas estruturadas no PDF

------------------------------------------------------------------------

## 📦 Como Executar o Projeto Localmente

### 1️⃣ Clone o repositório

``` bash
git clone https://github.com/weslyn-figueiredo/senai-labcontrol.git
```

### 2️⃣ Acesse a pasta do projeto

``` bash
cd senai-labcontrol
```

### 3️⃣ Instale as dependências

``` bash
npm install
```

### 4️⃣ Inicie o servidor de desenvolvimento

``` bash
npm start
```

O sistema estará disponível em: http://localhost:3000

------------------------------------------------------------------------

## 📄 Scripts Disponíveis

  Script           Descrição
  ---------------- --------------------------------------
  npm start        Inicia o ambiente de desenvolvimento
  npm run build    Gera a versão otimizada do projeto
  npm run deploy   Realiza o deploy para GitHub Pages

------------------------------------------------------------------------

## 📁 Estrutura das Imagens

Coloque as imagens dentro da pasta:

/public

Com os nomes:

screenshot-dashboard.png\
screenshot-inventario.png\
screenshot-modal.png\
screenshot-pdf.png

------------------------------------------------------------------------

## 👨‍🏫 Autor

Prof. Weslyn Figueiredo\
Instrutor de Tecnologia da Informação\
SENAI Macapá -- DR-AP

------------------------------------------------------------------------

## 📜 Licença

Uso educacional e institucional.
