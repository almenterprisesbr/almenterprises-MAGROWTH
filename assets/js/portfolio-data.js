/* Conteúdo do portfólio. Caminhos relativos à raiz do site.
 * Acrescente registros às listas e defina order para escolher a posição.
 * Campos de mídia/link vazios mostram “Em breve”, sem botão de abertura.
 * Sites: video, cover, link. Identidade: before, after, link.
 * Vídeos: video, cover e ratio opcional (ex.: "9 / 16").
 * Social: cover, posts (lista de caminhos), link opcional.
 */
window.PORTFOLIO_DATA = {
  sites: [
    { id: "landing-pages", order: 1, title: "Landing pages selecionadas", cover: "assets/img/portfolio/sites/landing-pages-slow.webp", video: "assets/video/portfolio/landing-pages-slow.mp4", link: "" }
  ],
  identities: [
    { id: "publimax", order: 1, title: "Publimax", cover: "", before: "assets/img/portfolio/identidade/publimax-antes-atual.webp", after: "assets/img/portfolio/identidade/publimax-depois-atual.webp", link: "" }
  ],
  videos: [
    { id: "ugc-moda", order: 1, title: "Moda · UGC", cover: "assets/img/portfolio/videos/ugc-moda-hq.webp", video: "assets/video/portfolio/ugc-moda-hq.mp4", ratio: "9 / 16" },
    { id: "torre-do-marfim", order: 2, title: "Torre do Marfim · Imobiliário", cover: "assets/img/portfolio/videos/torre-do-marfim.webp", video: "assets/video/portfolio/torre-do-marfim.mp4", ratio: "9 / 16" },
    { id: "byd-seal", order: 3, title: "BYD Seal · Automotivo", cover: "assets/img/portfolio/videos/byd-seal-hq.webp", video: "assets/video/portfolio/byd-seal-hq.mp4", ratio: "16 / 9" },
    { id: "ugc-cuidados-pele", order: 4, title: "Cuidados com a pele · UGC", cover: "assets/img/portfolio/videos/ugc-cuidados-pele.webp", video: "assets/video/portfolio/ugc-cuidados-pele.mp4", ratio: "9 / 16" },
    { id: "montblanc", order: 5, title: "Montblanc · Relógio", cover: "assets/img/portfolio/videos/montblanc.webp", video: "assets/video/portfolio/montblanc.mp4", ratio: "9 / 16" },
    { id: "porsche", order: 6, title: "Porsche · Automotivo", cover: "assets/img/portfolio/videos/porsche-hq.webp", video: "assets/video/portfolio/porsche-hq.mp4", ratio: "16 / 9" },
    { id: "arquitetura", order: 7, title: "Arquitetura · Imobiliário", cover: "assets/img/portfolio/videos/arquitetura-hq.webp", video: "assets/video/portfolio/arquitetura-hq.mp4", ratio: "9 / 16" }
  ],
  social: [
    { id: "personal", order: 1, title: "Personal / Academia", cover: "assets/img/portfolio/personal-academia/post-01-thumb.webp", posts: ["assets/img/portfolio/personal-academia/post-01.webp", "assets/img/portfolio/personal-academia/post-02.webp", "assets/img/portfolio/personal-academia/post-03.webp", "assets/img/portfolio/personal-academia/post-04.webp"], link: "" },
    { id: "estetica", order: 2, title: "Clínica Estética", cover: "assets/img/portfolio/clinica-estetica/post-02-thumb.webp", posts: ["assets/img/portfolio/clinica-estetica/post-01.webp", "assets/img/portfolio/clinica-estetica/post-02.webp", "assets/img/portfolio/clinica-estetica/post-03.webp", "assets/img/portfolio/clinica-estetica/post-04.webp"], link: "" },
    { id: "iphone", order: 3, title: "iPhone Duo", cover: "assets/img/portfolio/iphone-duo/post-01-thumb.webp", posts: ["assets/img/portfolio/iphone-duo/post-01.webp", "assets/img/portfolio/iphone-duo/post-02.webp", "assets/img/portfolio/iphone-duo/post-03.webp"], link: "" },
    { id: "imobiliario", order: 4, title: "Mercado Imobiliário", cover: "assets/img/portfolio/imobiliaria/post-01-thumb.webp", posts: ["assets/img/portfolio/imobiliaria/post-01.webp", "assets/img/portfolio/imobiliaria/post-02.webp", "assets/img/portfolio/imobiliaria/post-03.webp", "assets/img/portfolio/imobiliaria/post-04.webp", "assets/img/portfolio/imobiliaria/post-05.webp"], link: "" },
    { id: "barbearia", order: 5, title: "Barbearia", cover: "assets/img/portfolio/barbearia/post-01-thumb.webp", posts: ["assets/img/portfolio/barbearia/post-01.webp", "assets/img/portfolio/barbearia/post-02.webp", "assets/img/portfolio/barbearia/post-03.webp", "assets/img/portfolio/barbearia/post-04.webp", "assets/img/portfolio/barbearia/post-05.webp"], link: "" },
    { id: "acai", order: 6, title: "Açaí", cover: "assets/img/portfolio/acai/post-01-thumb.webp", posts: ["assets/img/portfolio/acai/post-01.webp", "assets/img/portfolio/acai/post-02.webp", "assets/img/portfolio/acai/post-03.webp", "assets/img/portfolio/acai/post-04.webp"], link: "" }
  ]
};
