Campo de formulário: `br-campo` envolvendo `label`, controle e `.ajuda`.

**O consumidor fornece:** o rótulo ligado ao `id` do controle; o controle; e uma ajuda opcional. Para campo obrigatório, use `<span class="req">*</span>`. Para dinheiro, envolva o input em `.prefixo` com o símbolo da moeda.

**Foco:** borda `laranja-acao` com halo `laranja-suave`. **Erro:** adicione `br-campo--erro` e `aria-invalid="true"`, e escreva a causa e como corrigir. Valide ao sair do campo e, depois de um envio com erro, leve o foco ao primeiro campo inválido.

**Não faça:** usar placeholder no lugar do rótulo nem rótulo em caixa alta.
