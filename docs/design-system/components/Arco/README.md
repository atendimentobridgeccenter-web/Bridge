Arco: o arco da ponte do logo usado como medidor de progresso de 0 a 100%. É o elemento de assinatura do sistema.

**Quando usar:** quanto do previsto do mês já entrou, a ocupação de uma turma, a presença de um aluno. Mostre no máximo dois arcos por tela.

**O consumidor fornece:** a fração (0 a 1), que define `stroke-dashoffset = comprimento × (1 − fração)` sobre o comprimento do arco (π × raio); o número em `.leitura b`; e a descrição em `.leitura span`. O SVG leva `role="img"` e um `aria-label` com o número e a descrição.

**Movimento:** o arco se enche em 900ms ao aparecer. Com `prefers-reduced-motion`, ele já aparece cheio.
