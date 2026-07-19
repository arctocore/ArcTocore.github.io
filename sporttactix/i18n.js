/* i18n.js — English + Danish translations for the menu & key labels */
const I18N = (() => {
  const DICT = {
    en: {
      'nav.dashboard': 'Dashboard',
      'nav.teams': 'Teams & Players',
      'nav.matches': 'Matches',
      'nav.scouting': 'Live Scouting',
      'nav.statistics': 'Statistics',
      'nav.tactics': 'Tactical Board',
      'nav.video': 'Video Analysis',
      'nav.training': 'Training Planner',
      'nav.exercises': 'Exercise Library',
      'nav.opponents': 'Opponent Analysis',
      'nav.reports': 'Reports',
      'nav.settings': 'Settings',
      'nav.help': 'Help & Tutorials',
      'nav.theme': 'Light / Dark',
      'brand.tagline': 'Coaching Platform',
      'footer.offline': 'Offline Ready',
      // Common
      'common.save': 'Save', 'common.cancel': 'Cancel', 'common.confirm': 'Confirm', 'common.delete': 'Delete',
      'common.edit': 'Edit', 'common.add': 'Add', 'common.new': 'New', 'common.remove': 'Remove', 'common.go': 'Go',
      'common.export': 'Export', 'common.import': 'Import', 'common.noData': 'No data', 'common.confirmTitle': 'Please confirm',
      'common.vs': 'vs', 'common.at': '@',
      'search.placeholder': 'Search players, matches, drills, tactics...',
      'status.injured': 'Injured', 'status.available': 'Available',
      'result.W': 'W', 'result.D': 'D', 'result.L': 'L',
      // Sport chooser
      'sport.choose': 'Choose Sport', 'sport.active': 'Active sport', 'sport.changed': 'Sport changed',
      // Dashboard
      'dash.title': 'Dashboard', 'dash.overviewFor': 'Overview for', 'dash.yourTeam': 'your team',
      'dash.startScouting': 'Start Live Scouting',
      'dash.teams': 'Teams', 'dash.players': 'Players', 'dash.matchesPlayed': 'Matches Played', 'dash.wins': 'Wins',
      'dash.winRate': 'win rate', 'dash.nextMatch': 'Next Match', 'dash.noUpcoming': 'No upcoming match scheduled.',
      'dash.lastResult': 'Last Result', 'dash.noPlayed': 'No matches played yet.',
      'dash.injuries': 'Injuries & Availability', 'dash.fullSquad': 'Full squad available.',
      'dash.teamForm': 'Team Form', 'dash.formTrend': 'Season performance trend across recent fixtures.',
      // Teams
      'teams.title': 'Teams & Players', 'teams.noTeam': 'No team', 'teams.addPlayer': 'Add Player',
      'teams.number': 'No.', 'teams.name': 'Name', 'teams.position': 'Position', 'teams.height': 'Height',
      'teams.status': 'Status', 'teams.actions': 'Actions',
      'teams.firstName': 'First name', 'teams.lastName': 'Last name', 'teams.editPlayer': 'Edit Player', 'teams.newPlayer': 'New Player',
      'teams.delPlayer': 'Delete this player?',
      // Matches
      'matches.title': 'Matches', 'matches.newMatch': 'New Match', 'matches.opponent': 'Opponent',
      'matches.date': 'Date', 'matches.type': 'Type', 'matches.venue': 'Venue', 'matches.score': 'Score',
      'matches.status': 'Status', 'matches.home': 'Home', 'matches.away': 'Away', 'matches.editMatch': 'Edit Match',
      'matches.delMatch': 'Delete this match?', 'matches.scheduled': 'Scheduled', 'matches.finished': 'Finished', 'matches.live': 'Live',
      // Scouting
      'scout.title': 'Live Scouting', 'scout.selectMatch': 'Select match', 'scout.start': 'Start', 'scout.pause': 'Pause',
      'scout.reset': 'Reset', 'scout.category': 'Category', 'scout.player': 'Player', 'scout.eventLog': 'Event Log',
      'scout.attack': 'Attack', 'scout.defense': 'Defense', 'scout.fouls': 'Fouls', 'scout.noEvents': 'No events yet.',
      // Statistics
      'stats.title': 'Statistics', 'stats.subtitle': 'Team & player performance',
      // Tactics
      'tactics.title': 'Tactical Board', 'tactics.subtitle': 'Design plays, shoot the ball, animate & record',
      'tactics.sport': 'Sport', 'tactics.tools': 'Tools', 'tactics.color': 'Color', 'tactics.frames': 'Frames & Animation',
      'tactics.record': 'Record Video', 'tactics.save': 'Save', 'tactics.addFrame': 'Add Frame', 'tactics.duplicate': 'Duplicate',
      'tactics.play': 'Play', 'tactics.clearDraw': 'Clear Drawings', 'tactics.recBtn': 'Record', 'tactics.stop': 'Stop',
      'tactics.deleteFrame': 'Delete Frame', 'tactics.frame': 'Frame', 'tactics.saved': 'Tactic saved',
      'tactics.hint': 'Pick Select, click a player to select it (glows). With Shoot, aim at a teammate to pass, or the goal to shoot — the keeper magnets nearby balls.',
      // Boxing
      'boxing.title': 'Boxing Sparring', 'boxing.help': 'Two boxers from top with gloves & body. Punch, defend and record the round.',
      'boxing.jabL': 'Left', 'boxing.jabR': 'Right', 'boxing.defend': 'Defend',
      'boxing.keys': 'Keys — Boxer A: A/D punch, S defend. Boxer B: J/L punch, K defend. Click a glove to punch, click a boxer to raise guard.',
      // Video
      'video.title': 'Video Analysis', 'video.import': 'Import Video', 'video.bookmark': 'Bookmark', 'video.noVideo': 'No video loaded.',
      // Training
      'training.title': 'Training Planner', 'training.newSession': 'New Session', 'training.noSessions': 'No training sessions yet.',
      'training.min': 'min',
      // Exercises
      'exercises.title': 'Exercise Library', 'exercises.newExercise': 'New Exercise', 'exercises.none': 'No exercises in this category.',
      // Opponents
      'opponents.title': 'Opponent Analysis', 'opponents.newOpponent': 'New Opponent', 'opponents.report': 'Scouting Report',
      'opponents.none': 'No opponents scouted.',
      // Reports
      'reports.title': 'Reports', 'reports.matchReport': 'Match Report', 'reports.playerReport': 'Player Report',
      'reports.seasonReport': 'Season Report', 'reports.csv': 'CSV', 'reports.print': 'PDF / Print',
      // Settings
      'settings.title': 'Settings', 'settings.subtitle': 'Preferences, data & account',
      'settings.appearance': 'Appearance & Usability', 'settings.theme': 'Theme', 'settings.dark': 'Dark', 'settings.light': 'Light',
      'settings.roleAccess': 'Role-based Access', 'settings.activeRole': 'Active role', 'settings.roleHint': 'Roles control which modules and actions are available.',
      'settings.dataSync': 'Data & Sync', 'settings.dataHint': 'Offline-first with auto-save every 30s. All data stored locally in IndexedDB.',
      'settings.exportBackup': 'Export Backup', 'settings.importBackup': 'Import Backup', 'settings.sendCoach': 'Send to Coach',
      'settings.resetData': 'Reset Data', 'settings.shortcuts': 'Keyboard Shortcuts', 'settings.switchModules': 'Switch modules',
      'settings.focusSearch': 'Focus search', 'settings.closeDialog': 'Close dialog',
      'settings.resetConfirm': 'Erase all local data? This cannot be undone.'
    },
    da: {
      'nav.dashboard': 'Oversigt',
      'nav.teams': 'Hold & Spillere',
      'nav.matches': 'Kampe',
      'nav.scouting': 'Live Registrering',
      'nav.statistics': 'Statistik',
      'nav.tactics': 'Taktiktavle',
      'nav.video': 'Videoanalyse',
      'nav.training': 'Træningsplan',
      'nav.exercises': 'Øvelsesbibliotek',
      'nav.opponents': 'Modstanderanalyse',
      'nav.reports': 'Rapporter',
      'nav.settings': 'Indstillinger',
      'nav.help': 'Hjælp & Vejledninger',
      'nav.theme': 'Lys / Mørk',
      'brand.tagline': 'Træningsplatform',
      'footer.offline': 'Klar Offline',
      // Common
      'common.save': 'Gem', 'common.cancel': 'Annuller', 'common.confirm': 'Bekræft', 'common.delete': 'Slet',
      'common.edit': 'Rediger', 'common.add': 'Tilføj', 'common.new': 'Ny', 'common.remove': 'Fjern', 'common.go': 'Gå til',
      'common.export': 'Eksportér', 'common.import': 'Importér', 'common.noData': 'Ingen data', 'common.confirmTitle': 'Bekræft venligst',
      'common.vs': 'mod', 'common.at': 'ude mod',
      'search.placeholder': 'Søg spillere, kampe, øvelser, taktik...',
      'status.injured': 'Skadet', 'status.available': 'Tilgængelig',
      'result.W': 'S', 'result.D': 'U', 'result.L': 'T',
      // Sport chooser
      'sport.choose': 'Vælg Sportsgren', 'sport.active': 'Aktiv sportsgren', 'sport.changed': 'Sportsgren ændret',
      // Dashboard
      'dash.title': 'Oversigt', 'dash.overviewFor': 'Oversigt for', 'dash.yourTeam': 'dit hold',
      'dash.startScouting': 'Start Live Registrering',
      'dash.teams': 'Hold', 'dash.players': 'Spillere', 'dash.matchesPlayed': 'Spillede Kampe', 'dash.wins': 'Sejre',
      'dash.winRate': 'sejrsrate', 'dash.nextMatch': 'Næste Kamp', 'dash.noUpcoming': 'Ingen kommende kampe planlagt.',
      'dash.lastResult': 'Seneste Resultat', 'dash.noPlayed': 'Ingen kampe spillet endnu.',
      'dash.injuries': 'Skader & Tilgængelighed', 'dash.fullSquad': 'Hele truppen er tilgængelig.',
      'dash.teamForm': 'Holdform', 'dash.formTrend': 'Sæsonens præstationstrend over de seneste kampe.',
      // Teams
      'teams.title': 'Hold & Spillere', 'teams.noTeam': 'Intet hold', 'teams.addPlayer': 'Tilføj Spiller',
      'teams.number': 'Nr.', 'teams.name': 'Navn', 'teams.position': 'Position', 'teams.height': 'Højde',
      'teams.status': 'Status', 'teams.actions': 'Handlinger',
      'teams.firstName': 'Fornavn', 'teams.lastName': 'Efternavn', 'teams.editPlayer': 'Rediger Spiller', 'teams.newPlayer': 'Ny Spiller',
      'teams.delPlayer': 'Slet denne spiller?',
      // Matches
      'matches.title': 'Kampe', 'matches.newMatch': 'Ny Kamp', 'matches.opponent': 'Modstander',
      'matches.date': 'Dato', 'matches.type': 'Type', 'matches.venue': 'Spillested', 'matches.score': 'Resultat',
      'matches.status': 'Status', 'matches.home': 'Hjemme', 'matches.away': 'Ude', 'matches.editMatch': 'Rediger Kamp',
      'matches.delMatch': 'Slet denne kamp?', 'matches.scheduled': 'Planlagt', 'matches.finished': 'Afsluttet', 'matches.live': 'Live',
      // Scouting
      'scout.title': 'Live Registrering', 'scout.selectMatch': 'Vælg kamp', 'scout.start': 'Start', 'scout.pause': 'Pause',
      'scout.reset': 'Nulstil', 'scout.category': 'Kategori', 'scout.player': 'Spiller', 'scout.eventLog': 'Hændelseslog',
      'scout.attack': 'Angreb', 'scout.defense': 'Forsvar', 'scout.fouls': 'Frikast', 'scout.noEvents': 'Ingen hændelser endnu.',
      // Statistics
      'stats.title': 'Statistik', 'stats.subtitle': 'Hold- og spillerpræstation',
      // Tactics
      'tactics.title': 'Taktiktavle', 'tactics.subtitle': 'Design spil, skyd bolden, animér & optag',
      'tactics.sport': 'Sportsgren', 'tactics.tools': 'Værktøjer', 'tactics.color': 'Farve', 'tactics.frames': 'Frames & Animation',
      'tactics.record': 'Optag Video', 'tactics.save': 'Gem', 'tactics.addFrame': 'Tilføj Frame', 'tactics.duplicate': 'Dupliker',
      'tactics.play': 'Afspil', 'tactics.clearDraw': 'Ryd Tegninger', 'tactics.recBtn': 'Optag', 'tactics.stop': 'Stop',
      'tactics.deleteFrame': 'Slet Frame', 'tactics.frame': 'Frame', 'tactics.saved': 'Taktik gemt',
      'tactics.hint': 'Vælg Vælg-værktøjet, klik på en spiller for at vælge den (gløder). Med Skud, sigt mod en medspiller for at aflevere, eller målet for at skyde — målmanden magnetiserer nærliggende bolde.',
      // Boxing
      'boxing.title': 'Boksning Sparring', 'boxing.help': 'To boksere set fra oven med handsker & krop. Slå, forsvar og optag runden.',
      'boxing.jabL': 'Venstre', 'boxing.jabR': 'Højre', 'boxing.defend': 'Forsvar',
      'boxing.keys': 'Taster — Bokser A: A/D slag, S forsvar. Bokser B: J/L slag, K forsvar. Klik en handske for at slå, klik en bokser for at hæve gardet.',
      // Video
      'video.title': 'Videoanalyse', 'video.import': 'Importér Video', 'video.bookmark': 'Bogmærke', 'video.noVideo': 'Ingen video indlæst.',
      // Training
      'training.title': 'Træningsplan', 'training.newSession': 'Ny Session', 'training.noSessions': 'Ingen træningssessioner endnu.',
      'training.min': 'min',
      // Exercises
      'exercises.title': 'Øvelsesbibliotek', 'exercises.newExercise': 'Ny Øvelse', 'exercises.none': 'Ingen øvelser i denne kategori.',
      // Opponents
      'opponents.title': 'Modstanderanalyse', 'opponents.newOpponent': 'Ny Modstander', 'opponents.report': 'Scoutingrapport',
      'opponents.none': 'Ingen modstandere scoutet.',
      // Reports
      'reports.title': 'Rapporter', 'reports.matchReport': 'Kamprapport', 'reports.playerReport': 'Spillerrapport',
      'reports.seasonReport': 'Sæsonrapport', 'reports.csv': 'CSV', 'reports.print': 'PDF / Udskriv',
      // Settings
      'settings.title': 'Indstillinger', 'settings.subtitle': 'Præferencer, data & konto',
      'settings.appearance': 'Udseende & Anvendelighed', 'settings.theme': 'Tema', 'settings.dark': 'Mørk', 'settings.light': 'Lys',
      'settings.roleAccess': 'Rollebaseret Adgang', 'settings.activeRole': 'Aktiv rolle', 'settings.roleHint': 'Roller styrer hvilke moduler og handlinger der er tilgængelige.',
      'settings.dataSync': 'Data & Synkronisering', 'settings.dataHint': 'Offline-først med auto-gem hvert 30. sekund. Alle data gemmes lokalt i IndexedDB.',
      'settings.exportBackup': 'Eksportér Backup', 'settings.importBackup': 'Importér Backup', 'settings.sendCoach': 'Send til Træner',
      'settings.resetData': 'Nulstil Data', 'settings.shortcuts': 'Tastaturgenveje', 'settings.switchModules': 'Skift modul',
      'settings.focusSearch': 'Fokus på søgning', 'settings.closeDialog': 'Luk dialog',
      'settings.resetConfirm': 'Slet alle lokale data? Dette kan ikke fortrydes.'
    }
  };
  let lang = 'en';

  function t(key) { return (DICT[lang] && DICT[lang][key]) || (DICT.en[key] || key); }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = DICT[lang] && DICT[lang][key];
      if (val) el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      const val = DICT[lang] && DICT[lang][key];
      if (val) el.setAttribute('placeholder', val);
    });
    document.documentElement.setAttribute('lang', lang);
  }

  function setLang(l) { lang = DICT[l] ? l : 'en'; apply(); }
  function getLang() { return lang; }

  return { t, apply, setLang, getLang, DICT };
})();
if (typeof window !== 'undefined') { window.I18N = I18N; window.T = I18N.t; }
