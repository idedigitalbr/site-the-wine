# Tema The Wine

## Resumo de tokens

- Fontes: display `Cormorant Garamond`, corpo `Albert Sans`.
- Público: fundo `#000000`, superfície `#0B0A08`, superfície secundária `#11100D`, texto `#FFFFFF`, dourado `#D3B97B`, dourado hover `#F1D093`, borda `rgba(211,185,123,.35)`.
- Admin: fundo `#F7F5F0`, superfície `#FFFFFF`, superfície secundária `#EFEAE0`, texto `#171512`, primária `#A98445`, hover `#876936`, muted `#686158`, borda `rgba(11,10,8,.14)`, sidebar `#0B0A08`.
- Estados: sucesso `#4F8A65`, alerta `#B9833C`, perigo `#9D524B`, informação `#557A8A`.
- Mesas: livre `#4F8A65`, selecionada `#D3B97B`, indisponível `#6F6A62`, reservada `#B9833C`, ocupada `#9D524B`, bloqueada `#5A5550`.
- Espaçamento base: 0.25rem a 4rem; raios: 0.5rem, 0.625rem, 0.75rem, 1rem.
- Breakpoint principal do shell: `lg`; cards usam grids responsivos e bordas discretas.

## Fonte real

```css
/* next-app/src/styles/reservation-tokens.css */
.reservation-theme,
.reservation-admin-theme {
  --font-display-ui: 'Cormorant Garamond', serif;
  --font-body-ui: 'Albert Sans', sans-serif;
  --radius-sm: 0.5rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --status-success: #4F8A65;
  --status-warning: #B9833C;
  --status-danger: #9D524B;
  --status-info: #557A8A;
}

.reservation-admin-theme {
  --background: #F7F5F0;
  --foreground: #171512;
  --surface: #FFFFFF;
  --surface-muted: #EFEAE0;
  --primary: #A98445;
  --primary-hover: #876936;
  --primary-foreground: #FFFFFF;
  --muted: #686158;
  --border: rgba(11, 10, 8, 0.14);
  --border-strong: rgba(11, 10, 8, 0.28);
  --focus-ring: #A98445;
  --sidebar: #0B0A08;
  --sidebar-foreground: #FFFFFF;
  --sidebar-muted: rgba(255, 255, 255, 0.68);
  --sidebar-accent: #D3B97B;
}
```

