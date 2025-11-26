/**
 * scripts/seed.js
 * ----------------
 * Script de seed (popular a base de dados com dados iniciais).
 *
 * CONTEXTO:
 * - Na Ficha 2, os dados vinham de um ficheiro `lembretes.js` com um array.
 *   Aqui, como usamos MongoDB, vamos criar esses dados diretamente na BD.
 *
 * OBJETIVO:
 * - Apagar todo o conteúdo atual das coleções `users` e `theories`.
 * - Criar:
 *     - 1 utilizador admin (para fazer login na área de gestão).
 *     - 1 utilizador normal (apenas para representar outro tipo de user).
 *     - Várias teorias da conspiração fictícias, com diferentes níveis
 *       de complexidade e tags.
 *
 * COMO USAR:
 * 1. Garante que:
 *      - tens o MongoDB Atlas configurado e o .env preenchido,
 *      - já fizeste `npm install`.
 * 2. No terminal, corre:
 *      - `npm run seed`
 *    (assumindo que tens "seed": "node scripts/seed.js" no package.json).
 *
 * O QUE ESTE SCRIPT NÃO FAZ:
 * - Não arranca o servidor Express.
 * - Não se preocupa com rotas nem views — apenas mexe na base de dados.
 *
 * IDEA IMPORTANTE PARA OS ALUNOS:
 * - Em muitos projetos reais, scripts de seed são usados para:
 *     - criar um "estado inicial" da aplicação (users, dados de teste),
 *     - facilitar desenvolvimento e testes,
 *     - evitar que cada programador tenha de inserir tudo à mão.
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { connectToDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";
import Theory from "../src/models/Theory.js";

/**
 * Gera um slug simples a partir de um título.
 *
 * EXEMPLOS:
 * - "Teoria dos semáforos empáticos" → "teoria-dos-semaforos-empaticos"
 * - " Chips de café na água"          → "chips-de-cafe-na-agua"
 *
 * REGRAS:
 * - converte para minúsculas;
 * - remove acentos básicos;
 * - troca espaços por hífens;
 * - remove qualquer coisa que não seja letra, número ou hífen.
 *
 * NOTA:
 * - Isto é uma versão simplificada de um "slugify", suficiente para a ficha.
 *
 * @param {string} title Título original da teoria.
 * @returns {string} Slug pronto a usar em URLs.
 */
function gerarSlug(title) {
    const semAcentos = title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos

    return semAcentos
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // remove caracteres estranhos
        .replace(/\s+/g, "-") // troca espaços por hífens
        .replace(/-+/g, "-"); // evita hífens repetidos
}

/**
 * Cria um hash de password seguro usando bcrypt.
 *
 * CONTEXTO:
 * - Nunca devemos guardar a password original na base de dados.
 * - Em vez disso, guardamos apenas uma versão "encriptada" (hash).
 * - No login, o bcrypt compara a password introduzida com o hash guardado.
 *
 * PARA A FICHA:
 * - Vamos usar um saltRounds = 10 (valor comum em muitos exemplos).
 *
 * @param {string} plainPassword Password em texto simples (ex.: "admin123").
 * @returns {Promise<string>} Hash da password (string longa com prefixo $2b$...).
 */
async function gerarPasswordHash(plainPassword) {
    const saltRounds = 10;
    return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Constrói a lista de utilizadores a inserir na coleção `users`.
 *
 * NOTA:
 * - Aqui definimos as passwords em texto simples apenas dentro do script,
 *   para fins didáticos. O que vai efetivamente para a BD é o hash.
 *
 * UTILIZADORES CRIADOS:
 * - admin:
 *     email: "admin@conspira.local"
 *     password: "admin123"
 * - user:
 *     email: "user@conspira.local"
 *     password: "user123"
 *
 * @returns {Promise<Array<import("../src/models/User.js").default>>}
 *          Array de documentos User criados (com _id preenchido).
 */
async function criarUtilizadores() {
    console.log("A criar utilizadores...");

    // Primeiro apagamos tudo o que existe na coleção
    await User.deleteMany({});

    const adminPasswordHash = await gerarPasswordHash("admin123");
    const userPasswordHash = await gerarPasswordHash("user123");

    const usersToCreate = [
        {
            email: "admin@conspira.local",
            displayName: "Administrador das Teorias",
            passwordHash: adminPasswordHash,
            role: "admin",
        },
        {
            email: "user@conspira.local",
            displayName: "Curioso Anónimo",
            passwordHash: userPasswordHash,
            role: "user",
        },
    ];

    const createdUsers = await User.insertMany(usersToCreate);

    console.log(`${createdUsers.length} utilizadores criados.`);

    return createdUsers;
}

/**
 * Constrói uma lista de teorias fictícias e insere na coleção `theories`.
 *
 * IDEIA:
 * - As teorias são inventadas, com um tom ligeiramente absurdo, mas com
 *   algum nível de "estrutura" para serem interessantes de ler.
 * - Cada teoria tem:
 *     - title, slug, summary, content, complexityLevel, tags, comments (opcional).
 *
 * @returns {Promise<Array<import("../src/models/Theory.js").default>>}
 *          Array de documentos Theory criados.
 */
async function criarTeorias() {
    console.log("A criar teorias da conspiração...");

    // Apagamos teorias existentes para começar de um estado limpo
    await Theory.deleteMany({});

    const teoriasBase = [
        {
            title: "Os patos dos jardins públicos são drones governamentais disfarçados",
            summary:
                'Teoria que defende que os patos em parques urbanos são na verdade robôs de vigilância que recarregam enquanto "dormem" com a cabeça debaixo da asa.',
            content:
                'Esta teoria começou quando alguém reparou que os patos urbanos nunca parecem verdadeiramente assustados com humanos, ao contrário dos patos selvagens. A hipótese é simples mas perturbadora: os "patos" que vemos em jardins públicos, fontes e lagos urbanos são na verdade sofisticados drones de vigilância disfarçados. O comportamento de "dormir com a cabeça debaixo da asa" seria, na realidade, o modo de carregamento solar através de painéis fotovoltaicos escondidos nas penas. O "quack" seria um sistema de comunicação entre unidades. A razão pela qual seguem pessoas com pão? Reconhecimento facial e mapeamento de padrões de comportamento social. Os defensores desta teoria apontam ainda para o facto de que ninguém nunca viu um pato bebé em parques urbanos - porque são fabricados já adultos. O grasnado característico seria, na verdade, um sistema de eco-localização similar ao sonar, permitindo mapear tridimensionalmente os espaços públicos. Quando formam filas organizadas atrás de pais com crianças, estariam a testar algoritmos de seguimento autónomo.',
            complexityLevel: "medium",
            tags: ["vigilancia", "animais", "parques"],
            comments: [
                {
                    authorName: "Administrador das Teorias",
                    text: "Confirmo: nunca vi um pato bebé num jardim urbano. Coincidência? 👀",
                },
                {
                    authorName: "Curioso Anónimo",
                    text: "Então aquele pato que me seguiu até ao carro estava a tirar notas…",
                },
            ],
        },
        {
            title: "Os pombos urbanos têm reuniões secretas para decidir onde fazer cocó",
            summary:
                "Afirma que os pombos se organizam em células coordenadas e escolhem estrategicamente carros recém-lavados como alvos prioritários.",
            content:
                'Qualquer pessoa que já lavou o carro sabe a verdade: em menos de 24 horas, aparece cocó de pombo. Esta teoria defende que isto não é coincidência, mas sim resultado de uma rede de comunicação sofisticada entre pombos urbanos. Observadores atentos notaram que os pombos frequentemente se reúnem em grupos em telhados e cornijas, aparentemente sem fazer nada - mas estariam, na realidade, a realizar briefings táticos. A teoria propõe a existência de "pombos-sentinela" que identificam carros recém-lavados (o brilho diferente é facilmente detectável do ar) e comunicam a localização aos "pombos-bombardeiros" através de um sistema complexo de arrulhos codificados. O timing perfeito - sempre quando o dono acabou de pagar a lavagem - seria resultado de observação e aprendizagem de padrões humanos ao longo de gerações. Alguns investigadores amadores documentaram casos em que múltiplos pombos atacam o mesmo carro simultaneamente de diferentes ângulos, numa coordenação que sugere planeamento militar. A motivação? Vingança ancestral por séculos de estátuas de humanos que eles são obrigados a limpar. Existem até relatos de "listas negras de alvos prioritários" que incluem carros de luxo, conversíveis recém-abertos, e qualquer veículo estacionado debaixo do sítio favorito de descanso deles. A estrutura organizacional incluiria comandantes regionais (os pombos maiores e mais grisalhos) que coordenam operações em diferentes bairros da cidade.',
            complexityLevel: "medium",
            tags: ["animais", "conspiracao", "cidades"],
            comments: [
                {
                    authorName: "Condutor Exasperado",
                    text: "Explica porque é que só sujam o carro quando tenho reunião importante.",
                },
            ],
        },
        {
            title: "As meias desaparecidas na máquina de lavar vão para outra dimensão",
            summary:
                "Uma teoria quântica que propõe que as máquinas de lavar criam micro-portais dimensionais que sugam aleatoriamente uma meia de cada par.",
            content:
                'Segundo cálculos avançados de física teórica altamente questionável, o movimento rotativo da máquina de lavar a altas velocidades, combinado com as propriedades únicas do tecido das meias (geralmente algodão ou fibras sintéticas), cria uma "tempestade perfeita" de condições que podem rasgar momentaneamente o tecido do espaço-tempo. As meias, sendo pequenas e de baixa densidade, seriam sugadas através destes micro-portais para uma dimensão paralela - a "Dimensão das Meias Perdidas". A teoria explica por que razão é sempre só UMA meia que desaparece: o portal é instável e fecha-se rapidamente após sugar o primeiro objeto. Estudos independentes (leia-se: pessoas frustradas no Reddit) notaram que as meias perdidas são geralmente as favoritas ou as mais caras, sugerindo que a dimensão paralela tem algum tipo de critério de seleção baseado em valor emocional. Alguns teóricos mais extremos acreditam que existe uma civilização inteira construída com meias desaparecidas nessa dimensão, onde seres unípedes vivem em harmonia. A prova final? Ninguém, em toda a história da humanidade, conseguiu alguma vez encontrar uma meia desaparecida depois de procurar exaustivamente.',
            complexityLevel: "medium",
            tags: ["fisica", "casa", "dimensoes"],
            comments: [
                {
                    authorName: "Estudante Desesperado",
                    text: "A minha meia da sorte de exames claramente foi promovida a entidade interdimensional.",
                },
            ],
        },
        {
            title: "As empresas funerárias criaram o desporto radical para aumentar o negócio",
            summary:
                "Teoria que defende que os desportos radicais foram secretamente promovidos e financiados por uma aliança global de agências funerárias para garantir um fluxo constante de clientes jovens.",
            content:
                'A teoria sugere que nos anos 80, quando o mercado funerário estava em crise (as pessoas viviam demasiado tempo graças aos avanços médicos), um cartel de empresas funerárias reuniu-se secretamente em Genebra para resolver o "problema da longevidade". A solução? Criar uma cultura de desportos radicais que normalizasse comportamentos de risco extremo entre jovens saudáveis. Documentos alegadamente vazados mostram campanhas massivas para popularizar atividades como paraquedismo, bungee jumping, parkour, wingsuit flying, e surf de ondas gigantes. O slogan "viver ao limite" não seria sobre liberdade, mas sim marketing disfarçado de memento mori. Os "influencers" de desportos radicais? Financiados secretamente através de empresas fantasma. Os vídeos virais de acidentes quase fatais? Publicidade subliminar para normalizar o perigo. A prova mais perturbadora: investigação independente revelou que muitas empresas de equipamento radical têm acionistas em comum com grandes funerárias multinacionais. O pico de popularidade do Red Bull (que "dá asas") coincidiu exatamente com a abertura de 347 novas agências funerárias especializadas em "cerimónias jovens e modernas" com caixões coloridos e música eletrónica. Os pacotes de seguro de vida destes desportos têm cláusulas suspeitosamente detalhadas sobre como querem ser enterrados, quase como se estivessem a fazer pré-venda. Alguns teóricos apontam que festivais de desportos radicais são sempre patrocinados por marcas cujos CEOs têm ligações familiares a empresas funerárias. Coincidência? Os defensores desta teoria dizem que não.',
            complexityLevel: "high",
            tags: ["desporto", "economia", "morte"],
            comments: [
                {
                    authorName: "Administrador das Teorias",
                    text: "Chamem-lhe sinergias de negócio…",
                },
                {
                    authorName: "Curioso Anónimo",
                    text: "De repente o paraquedismo parece muito mais caro… em vários sentidos.",
                },
            ],
        },
        {
            title: "Os fabricantes de alarmes de incêndio sabem exatamente quando vais adormecer",
            summary:
                'Teoria segundo a qual os alarmes de incêndio têm sensores que detetam quando finalmente adormeces e só aí começam a apitar "bateria fraca" às 3h da manhã.',
            content:
                'Qualquer pessoa que já teve um alarme de incêndio sabe a verdade aterradora: o aviso de bateria fraca NUNCA acontece durante o dia, quando estás acordado e podes resolvê-lo facilmente. É sempre às 3 ou 4 da manhã, quando finalmente conseguiste adormecer depois de horas a rolar na cama. Esta teoria propõe que os alarmes de incêndio modernos têm sensores de ondas cerebrais rudimentares (escondidos no chip principal) que detetam quando entras em sono profundo. Só então, numa crueldade meticulosamente calculada, emitem aquele "BIP" agudo de 120 decibéis a cada 30 segundos. A motivação económica é diabólica mas brilhante: os fabricantes descobriram através de grupos focais secretos nos anos 90 que alarmes que apitam durante o dia são imediatamente arrancados da parede com raiva e substituídos por marcas concorrentes. Mas alarmes que apitam de noite criam um trauma psicológico profundo que faz as pessoas comprarem baterias "premium de longa duração" (com margem de lucro de 300%) e até alarmes "silenciosos" mais caros. O intervalo de 30 segundos foi testado em laboratório e é calculado cientificamente para ser curto demais para conseguires voltar a adormecer, mas longo o suficiente para não conseguires prever quando vem o próximo BIP - maximizando a ansiedade. É essencialmente tortura acústica certificada, mas ninguém pode processar porque "tecnicamente está a cumprir a função de segurança contra incêndios". Testemunhas anónimas de dentro da indústria afirmam ter visto engenheiros a rir-se em conferências quando apresentam estudos sobre "optimização do timing de notificação noturna para maximizar resposta emocional do consumidor". Um denunciante alegou que existe um Easter egg no código de certos modelos: se mudares a bateria durante o dia, o alarme espera exatamente 72 horas antes de começar a apitar de novo... sempre de noite. A cereja no topo do bolo? As baterias "normais" duram exatamente o tempo da garantia, mas as "premium" falham logo depois do período de devolução.',
            complexityLevel: "medium",
            tags: ["tecnologia", "sono", "sadismo"],
            comments: [
                {
                    authorName: "Vítima do BIP",
                    text: "Escrevi isto às 3h12 depois do terceiro BIP.",
                },
            ],
        },
        {
            title: "Os semáforos empáticos que ajustam o trânsito ao humor da cidade",
            summary:
                "Uma teoria que defende que certos semáforos analisam microexpressões dos peões e ajustam o trânsito para controlar o humor coletivo.",
            content:
                "Segundo esta teoria, alguns semáforos instalados em grandes cidades não servem apenas para controlar o fluxo de carros. Eles estariam equipados com câmaras capazes de ler microexpressões faciais e sensores que detetam padrões de stress na multidão. Com base nesses dados, o sistema atrasaria ou adiantaria o sinal verde para manipular discretamente o humor das pessoas: mais tempo à espera em dias de protesto, passagens rápidas em dias de grandes eventos, e assim por diante. A hipótese sugere que estes ajustes são usados como ferramenta de 'gestão emocional urbana', reduzindo a probabilidade de conflitos visíveis, mas aumentando a sensação difusa de cansaço e irritação.",
            complexityLevel: "medium",
            tags: ["transito", "monitorizacao", "humor"],
            comments: [
                {
                    authorName: "Condutor Atrasado",
                    text: "Então o semáforo sabe quando tenho mesmo de chegar a horas.",
                },
            ],
        },
        {
            title: "As máquinas de café que treinam algoritmos de produtividade secreta",
            summary:
                "Esta teoria propõe que algumas máquinas de café em escritórios recolhem horários e padrões de consumo para prever picos de produtividade.",
            content:
                "De acordo com esta teoria, certas máquinas de café em escritórios e espaços de cowork não se limitam a servir bebidas. Cada vez que escolhes o tipo de café, a intensidade ou o horário em que o consomes, a máquina regista silenciosamente essa informação. Esses dados seriam enviados para um sistema central que constrói perfis de produtividade: quem rende mais depois de um expresso, quem precisa de dois cafés para ficar minimamente funcional, e em que horários cada equipa atinge o pico de concentração. A partir daqui, decisões sobre reuniões, prazos e até iluminação do escritório poderiam ser ajustadas para maximizar a produção sem que ninguém perceba que o 'cheiro a café' é também uma ferramenta de monitorização.",
            complexityLevel: "high",
            tags: ["escritorio", "dados", "produtividade"],
            comments: [
                {
                    authorName: "Estagiário Caffeinado",
                    text: "Se a máquina me julga pelo terceiro café, estamos tramados.",
                },
            ],
        },
        {
            title: "Os carregadores de telemóvel que afinam o ciclo de sono dos estudantes",
            summary:
                "Teoria que afirma que alguns carregadores 'inteligentes' adaptam a velocidade de carga para empurrar discretamente o horário de sono.",
            content:
                "Esta teoria defende que certos carregadores de telemóvel, especialmente os vendidos em campanhas de regresso às aulas, incluem um microcontrolador que decide a velocidade real de carregamento durante a noite. Quando o utilizador tem o hábito de ir dormir tarde, o carregador acelera a carga inicialmente para que o telemóvel chegue rapidamente aos 70–80%, incentivando o uso prolongado. Só mais tarde, quando o utilizador finalmente vai dormir, o carregador abranda a carga para terminar perto da hora de acordar. A consequência é um ciclo de sono ligeiramente desfasado que torna os estudantes mais dependentes de cafés, bebidas energéticas e aplicações de gestão de tempo. Tudo isto, claro, sem qualquer aviso no manual de instruções.",
            complexityLevel: "medium",
            tags: ["sono", "telemovel", "estudantes"],
            comments: [
                {
                    authorName: "Estudante Crónicamente Atrasado",
                    text: "Finalmente uma explicação científica para o meu sono às 3h.",
                },
            ],
        },
        {
            title: "As plantas decorativas que medem o nível de atenção nas salas de aula online",
            summary:
                "Uma teoria segundo a qual certas plantas vendidas como 'purificadoras de ar' incluem sensores que avaliam a atenção dos alunos em aulas remotas.",
            content:
                "Nesta teoria, algumas plantas decorativas supostamente 'otimizadas' para escritórios e cantos de estudo viriam, na verdade, com sensores discretos de luz e som integrados nos vasos. Durante aulas online, essas plantas recolheriam dados sobre movimento, padrões de digitação e variações de voz dos participantes. A informação seria agregada por algoritmo e convertida em um 'índice de atenção real' da turma. Plataformas de ensino poderiam então usar esse índice para ajustar a dificuldade dos conteúdos, o ritmo das explicações ou até sugerir pausas estratégicas. Oficialmente, as plantas seriam apenas um elemento de bem-estar; na prática, funcionariam como pequenos observadores silenciosos de comportamento académico.",
            complexityLevel: "high",
            tags: ["educacao", "monitorizacao", "online"],
            comments: [
                {
                    authorName: "Aluno Suspeito",
                    text: "A planta ao lado do portátil está claramente a tomar notas.",
                },
            ],
        },
        {
            title: "Os relógios de parede que sincronizam pequenos atrasos em reuniões importantes",
            summary:
                "Teoria que sugere que alguns relógios em salas de reunião foram calibrados para criar atrasos mínimos, mas constantes, em decisões críticas.",
            content:
                "Segundo esta teoria, certos relógios de parede em salas de reunião não estão 'ligeiramente adiantados' por acidente. Em vez disso, teriam sido ajustados para criar atrasos sistemáticos de alguns minutos em determinados períodos do dia. Em reuniões importantes, isso faria com que decisões fossem tomadas com pressa extra, reduzindo o tempo disponível para discussão. Ao longo de semanas, estes atrasos microplaneados poderiam alterar a forma como projetos inteiros são aprovados, rejeitados ou adiados. A conspiração não estaria em grandes mudanças visíveis, mas numa soma de pequenas pressas que empurram grupos para decisões menos refletidas.",
            complexityLevel: "low",
            tags: ["tempo", "reunioes", "organizacoes"],
        },
    ];

    // Para cada teoria, construímos o objeto final com slug e sem comentários iniciais
    const teoriasParaCriar = teoriasBase.map((t) => ({
        ...t,
        slug: gerarSlug(t.title),
        comments: t.comments || [],
    }));

    const createdTheories = await Theory.insertMany(teoriasParaCriar);

    console.log(`${createdTheories.length} teorias criadas.`);

    return createdTheories;
}

/**
 * Função principal do script de seed.
 *
 * FLUXO:
 * 1. Liga à base de dados (usando o mesmo método da app).
 * 2. Cria utilizadores.
 * 3. Cria teorias.
 * 4. Mostra um resumo no terminal.
 * 5. Fecha a ligação ao MongoDB.
 *
 * NOTA:
 * - Usamos try/catch para capturar qualquer erro inesperado e garantir
 *   que a ligação à BD é fechada no fim (mongoose.disconnect).
 *
 * @returns {Promise<void>} Promise que resolve quando o script terminar.
 */
async function runSeed() {
    try {
        console.log("A iniciar script de seed...");

        await connectToDatabase();

        const users = await criarUtilizadores();
        const theories = await criarTeorias();

        console.log("Seed concluído com sucesso!");
        console.log("Utilizadores criados:");
        users.forEach((u) => {
            console.log(` - ${u.displayName} <${u.email}> (role: ${u.role})`);
        });

        console.log("\nTeorias criadas (títulos):");
        theories.forEach((t) => {
            console.log(` - ${t.title} [${t.complexityLevel}]`);
        });
    } catch (error) {
        console.error("Erro durante o seed:", error);
    } finally {
        // Muito importante: fechar a ligação ao MongoDB no fim do script
        await mongoose.disconnect();
        console.log("Ligação ao MongoDB fechada.");
    }
}

// Executar o script se este ficheiro for corrido diretamente com node
// (é o nosso caso quando fazemos `npm run seed`).
runSeed();
