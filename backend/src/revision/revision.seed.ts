// Contenu de démarrage : fiches Linux & Réseau (fidèles aux fiches de révision de Gaëtan)
// + flashcards de base. Réseau porte un entraîneur interactif (trainerKey: 'reseau').

export const LINUX_SHEET = `## 01 · L'arborescence & les chemins

Sous Linux, « tout est fichier ». Tout part d'une racine unique \`/\` et se range dans une arborescence normalisée.

| Répertoire | Contenu |
| --- | --- |
| \`/\` | La racine : le sommet de toute l'arborescence |
| \`/home/p.nom\` | Le dossier personnel d'un utilisateur. Raccourci : \`~\` |
| \`/etc\` | Fichiers de configuration (\`passwd\`, \`*.conf\`…) |
| \`/var/log\` | Les journaux (logs) : \`messages\`, \`secure\`… |
| \`/var/spool\` | Files d'attente (impression, mail, cron…) |
| \`/tmp\` | Fichiers temporaires, effacés au redémarrage |
| \`/bin\` \`/usr/bin\` | Les exécutables (les commandes elles-mêmes) |
| \`/dev\` | Les périphériques. \`/dev/null\` = la « corbeille » |

**Absolu** : part toujours de la racine (\`/etc/passwd\`), marche depuis n'importe où.
**Relatif** : part du répertoire courant (\`./mes_documents\`, \`../etc\`).

\`.\` = courant · \`..\` = parent · \`~\` = home (\`/home/p.nom\`) · \`-\` = précédent (avec \`cd\`).

\`\`\`bash
cd ../../etc   # relatif : remonter puis descendre
cd /etc        # absolu : le plus sûr
\`\`\`

## 02 · Se repérer & se déplacer

Trois réflexes : savoir où je suis (\`pwd\`), voir ce qu'il y a (\`ls\`), me déplacer (\`cd\`).

| Commande | Rôle | Options utiles |
| --- | --- | --- |
| \`pwd\` | Affiche le chemin du répertoire courant | — |
| \`cd [rép]\` | Se déplacer | \`cd\` seul → retour à \`~\` |
| \`ls\` | Lister fichiers et répertoires | \`-l\` détail · \`-a\` cachés · \`-h\` lisible · \`-t\` date · \`-R\` récursif |

> **À retenir** — \`ls -la\` = tout lister, fichiers cachés (commençant par \`.\`) inclus, format détaillé. L'usage le plus courant.

Lire une ligne \`ls -l\` :
\`\`\`
-rw-r--r--  1  p.nom  p.nom  710  4 juin 16:41  fichier
permissions │  proprio groupe taille  date        nom
        nb de liens
\`\`\`
1er caractère : \`-\` fichier, \`d\` répertoire, \`l\` lien. Les 9 suivants = droits (rwx pour proprio/groupe/autres).

## 03 · Créer & supprimer

| Commande | Rôle | Option clé |
| --- | --- | --- |
| \`touch fic\` | Crée un fichier vide (ou met à jour sa date) | — |
| \`mkdir rep\` | Crée un répertoire | \`-p\` crée les parents manquants |
| \`rmdir rep\` | Supprime un répertoire **vide** | — |
| \`rm fic\` | Supprime un fichier | \`-r\` récursif · \`-f\` force |

> **⚠️ DANGER** — \`rm -rf\` supprime tout, récursivement et sans poser de question. Aucune corbeille, aucun retour en arrière. Vérifie toujours le chemin avant de valider.

\`\`\`bash
mkdir -p mes_videos/series
mkdir -p TP_recap/repertoire{1..3}/{tp_en_cours,tp_fini}
# 3 répertoires × 2 sous-dossiers = 6 dossiers d'un coup
\`\`\`

## 04 · Copier, déplacer, renommer

| Commande | Rôle | Option clé |
| --- | --- | --- |
| \`cp src dest\` | Copie (l'original reste) | \`-r\` récursif |
| \`mv src dest\` | Déplace (l'original disparaît) | — |
| \`mv ancien nouveau\` | Renomme (déplacement « sur place ») | — |

> **L'astuce mv** — Pas de commande « rename » de base : renommer = déplacer vers le même endroit avec un autre nom.

\`\`\`bash
mv fichier1 ./mes_documents/rep1/              # déplacer
mv fichier1 fichier                            # renommer
cp ./mes_documents/rep1/fichier ./series/      # copier
cp /etc/passwd ~/mes_documents/users           # copier ET renommer
\`\`\`

## 05 · Afficher le contenu d'un fichier

| Commande | Rôle | Option clé |
| --- | --- | --- |
| \`cat\` | Affiche tout (peut concaténer) | — |
| \`tac\` | Comme cat mais à l'envers | — |
| \`less\` | Page par page, navigable | \`q\` quitter · \`/\` recherche |
| \`head\` | 10 premières lignes | \`-n 5\` |
| \`tail\` | 10 dernières lignes | \`-n 3\` · \`-f\` suit en direct |
| \`sort\` | Trie (alphabétique) | \`-n\` numérique · \`-r\` inverse · \`-k\` champ |

> **Le couteau suisse : tail -f** — suit en temps réel les nouvelles lignes ajoutées à un fichier. Indispensable pour surveiller un log (\`/var/log/messages\`).

## 06 · Date & heure

| Format | Résultat |
| --- | --- |
| \`date\` | Date et heure complètes |
| \`date +%A\` | Jour de la semaine en lettres |
| \`date +%H:%M\` | Heure:Minute |
| \`date +%D\` | MM/JJ/AA |
| \`date +%d-%m-%Y\` | JJ-MM-AAAA |
| \`date +%F\` | ISO AAAA-MM-JJ |

> **Astuce mémoire** — minuscules ≠ majuscules : \`%m\` = mois, \`%M\` = minutes ; \`%d\` = jour, \`%D\` = date courte.

## 07 · Session & système

| Commande | Rôle |
| --- | --- |
| \`whoami\` | Mon nom d'utilisateur |
| \`id\` | UID, GID et groupes (uid=1000 = 1er user créé) |
| \`who\` | Utilisateurs connectés |
| \`clear\` | Nettoie l'affichage |
| \`history\` | Historique (\`history 7\` → 7 dernières) |
| \`shutdown\` | Éteint (\`shutdown -h now\`) |
| \`reboot\` | Redémarre |

> **Droits requis** — \`shutdown\` et \`reboot\` touchent toute la machine : ils demandent les droits **root**.

## 08 · echo & les méta-caractères

| Syntaxe | Effet |
| --- | --- |
| \`"…"\` (guillemets) | Faibles : \`$VAR\` et \`$(…)\` sont interprétés |
| \`'…'\` (quotes) | Fortes : tout est pris au pied de la lettre |
| \`\\\` (antislash) | Échappe un seul caractère spécial |

Insérer une commande dans du texte : \`$(commande)\` (moderne) ou \`\\\`commande\\\`\` (backticks).

\`\`\`bash
echo "Nous sommes $(date +%A), journée sport."
# → Nous sommes jeudi, journée sport.
\`\`\`

## 09 · L'éditeur vim

vim fonctionne par **modes**. La clé : Échap revient au mode Normal, d'où tout part.

| Action | Touches |
| --- | --- |
| Annuler | \`u\` |
| Copier / couper la ligne | \`yy\` / \`dd\` |
| Coller | \`p\` |
| Aller à une ligne | \`:n\` · \`gg\` (début) · \`G\` (fin) |
| Remplacer partout | \`:%s/John/Johnny/g\` |
| Sauvegarder | \`:w\` |
| Quitter / forcer | \`:q\` / \`:q!\` |
| Sauver ET quitter | \`:wq\` · \`:x\` · \`ZZ\` |

Modes : **Normal** (point de départ) · **Insertion** (\`i\`/\`a\`/\`o\`) · **Commande** (\`:\`) · **Recherche** (\`/mot\` puis \`n\`).

> **Réflexe de survie** — Bloqué ? Échap puis \`:q!\` quitte sans rien sauvegarder. \`:wq\` sauve et quitte.

## 10 · Les redirections

Trois flux : entrée (0), sortie standard (1), erreurs (2).

| Opérateur | Effet |
| --- | --- |
| \`> fic\` | Sortie dans fic (**écrase**) |
| \`>> fic\` | Sortie **à la suite** (ajoute) |
| \`2> fic\` | Erreurs seules (flux 2) |
| \`2> /dev/null\` | Jette les erreurs |
| \`&> fic\` | Sortie + erreurs |
| \`< fic\` | fic comme entrée |

> **⚠️ Piège classique** — un seul \`>\` écrase tout. Pour ajouter sans perdre l'existant, c'est toujours le double \`>>\`.

## 11 · Les tubes (pipes)

Le tube \`|\` branche la sortie d'une commande sur l'entrée de la suivante.

\`\`\`bash
# compter les groupes dont l'id commence par 9 :
sort -d groupes | tail -n 25 | cut -d ":" -f 3 | grep "^9" | wc -l
\`\`\`

> **Tube ≠ redirection** — La redirection \`>\` envoie vers un **fichier**. Le tube \`|\` envoie vers une **autre commande**.

## 12 · Filtrer le texte : grep, cut, sort, wc

| Syntaxe | Effet |
| --- | --- |
| \`grep root users\` | Lignes contenant « root » |
| \`grep "^root"\` | \`^\` = début de ligne |
| \`grep "shutdown$"\` | \`$\` = fin de ligne |
| \`grep -i\` | Ignore la casse |
| \`grep -c\` | Compte au lieu d'afficher |
| \`grep -v\` | Inverse (lignes qui ne contiennent pas) |
| \`cut -d ":" -f 3\` | Extrait le 3e champ (\`-d\` séparateur, \`-f\` champ) |
| \`wc -l\` / \`-w\` / \`-m\` | Compte lignes / mots / caractères |

## 13 · Le fichier /etc/passwd

Chaque ligne = un utilisateur, 7 champs séparés par \`:\`.

\`\`\`
root:x:0:0:root:/root:/bin/bash
 1   2 3 4  5    6        7
\`\`\`

| # | Champ | Signification |
| --- | --- | --- |
| 1 | nom | Identifiant de connexion (login) |
| 2 | password | \`x\` = mot de passe chiffré dans \`/etc/shadow\` |
| 3 | UID | Identifiant numérique. **0 = root** |
| 4 | GID | Identifiant du groupe principal |
| 5 | GECOS | Champ commentaire (optionnel) |
| 6 | directory | Répertoire de connexion (\`$HOME\`) |
| 7 | shell | Programme lancé à la connexion (\`/bin/bash\`) |

## 14 · Trouver commandes & variables

| Commande | Rôle |
| --- | --- |
| \`which sort\` | Chemin de l'exécutable utilisé |
| \`whereis -b sort\` | Localise le binaire |
| \`type sort\` | Nature (binaire, alias, fonction…) |
| \`env\` | Toutes les variables d'environnement |
| \`echo $PATH\` | Dossiers où le shell cherche les commandes |

> **À quoi sert $PATH** — Le shell parcourt chaque dossier de \`$PATH\` (séparés par \`:\`) jusqu'à trouver l'exécutable. Sinon : « introuvable ».

## 15 · find — la commande clé

Structure : \`find [où] [critères] [action]\`.

| Critère | Sélectionne |
| --- | --- |
| \`-name "*.conf"\` | Par nom (jokers entre guillemets) |
| \`-iname\` | Idem, insensible à la casse |
| \`-type f / d / l\` | Fichier / répertoire / lien |
| \`-empty\` | Vides |
| \`-size 710c\` | Taille (\`c\` octets, \`k\`, \`M\` ; \`+1M\` = plus grand) |
| \`-links 12\` | Par nombre de liens |
| \`-perm 600\` | Permissions exactes |
| \`-user p.nom\` | Par propriétaire |
| \`-mtime +2\` / \`-mmin +2\` | Modifié il y a +2 jours / minutes |
| \`! -name ".s*"\` | Négation |

Actions : (rien) = \`-print\` · \`-exec cmd {} \\;\` · \`-ls\` · \`2> /dev/null\` (jette les erreurs).

\`\`\`bash
find /var/spool -type d 2> /dev/null
find /etc -name "*.conf" 2> /dev/null
find /etc -type f -empty 2>/dev/null -exec cp {} ~/backup/ \\;
find ~ -type f -mmin +2 ! -name ".b*" ! -name ".s*" -exec ls -hs {} \\;
find / -user p.nom -perm 600 2>/dev/null -exec cp {} /tmp/ \\;
\`\`\`

> **Le réflexe -exec** — Pense la formule comme une phrase : « trouve (critères), puis pour chacun \`-exec\` fais (commande) \`{}\` et c'est fini \`\\;\` ».

## 16 · Antisèche

**Naviguer** : \`pwd\` · \`ls -la\` · \`cd\`
**Fichiers** : \`touch\` · \`mkdir -p\` · \`cp -r\` · \`mv\` · \`rm -rf\`
**Lire** : \`cat\` · \`tac\` · \`less\` · \`head -n\` · \`tail -f\`
**Filtrer** : \`grep "^x"\` · \`cut -d ":" -f N\` · \`sort\` · \`wc -l\`
**Flux** : \`>\` / \`>>\` · \`2> /dev/null\` · \`cmd1 | cmd2\`
**find** : \`-type f/d\` · \`-name\` · \`-size\` · \`-perm\` · \`-user\` · \`-exec cmd {} \\;\`
**vim** : \`i\` · Échap · \`:%s/a/b/g\` · \`:wq\` · \`:q!\`
**Système** : \`id\` · \`whoami\` · \`who\` · \`date +%d-%m-%Y\` · \`which\``;

export const RESEAU_SHEET = `## 01 · Vocabulaire : normes & organismes

**Norme** = règle officielle de conformité, fixée par un organisme officiel / l'État. Caractère réglementaire.
**Standard** = règle imposée par l'usage (de fait). Ex. : **TCP/IP est un standard**, pas une norme.

Les organismes :
- **ISO** — (grec « égal », 165 pays). À l'origine du modèle **OSI**.
- **IEEE** — Institute of Electrical and Electronics Engineers : **802.3** = Ethernet, **802.11** = Wi-Fi, **802.15** = Bluetooth.
- **IETF** — Internet Engineering Task Force (standards Internet, TCP/IP).
- **AFNOR** — normalisation française. **Ministère des armées** : normes propres.

## 02 · Portées des réseaux

| Sigle | Nom complet | Portée |
| --- | --- | --- |
| PAN | Personal Area Network | Personnelle (Bluetooth, USB) |
| LAN | Local Area Network | Locale — bâtiment, entreprise, maison |
| MAN | Metropolitan Area Network | Échelle d'une ville |
| WAN | Wide Area Network | Très étendue — pays, monde (Internet) |

> **PAN < LAN < MAN < WAN**

## 03 · Modèle OSI ↔ Modèle TCP/IP

OSI = modèle **théorique en 7 couches** (référence). TCP/IP = modèle **pratique en 4 couches** (réellement utilisé). On lit de bas en haut (1 → 7).

| OSI (7 couches) | TCP/IP (4 couches) | Exemples |
| --- | --- | --- |
| 7 Application · 6 Présentation · 5 Session | **Application** | HTTP, DNS, FTP |
| 4 Transport | **Transport** | TCP, UDP |
| 3 Réseau | **Internet** | IP, ICMP, ARP |
| 2 Liaison · 1 Physique | **Accès réseau** | Ethernet, Wi-Fi |

> **Mnémo (bas → haut)** : **P**our **L**e **R**éseau **T**out **S**e **P**asse **A**utomatiquement → Physique · Liaison · Réseau · Transport · Session · Présentation · Application.

## 04 · Rôle de chaque couche TCP/IP

| Couche | Rôle | Protocole(s) |
| --- | --- | --- |
| Application | Fournir les services réseau à l'utilisateur | HTTP, DNS |
| Transport | Acheminer les données **de bout en bout** | TCP, UDP |
| Internet | Identifier le destinataire et l'atteindre (adressage logique + routage) | IPv4 |
| Accès réseau | Adapter le signal au canal de transmission | Ethernet |

## 05 · Encapsulation & désencapsulation

En descendant les couches (émission), chaque couche ajoute un en-tête = **encapsulation**. À la réception, on remonte et on retire chaque en-tête = **désencapsulation**.

- **En-tête (header)** : identifie le type de donnée encapsulée et indique comment l'acheminer. Lu puis enlevé à la désencapsulation.
- **PDU** (Protocol Data Unit) = unité de données à un niveau donné. **SAP** (Service Access Point) = point d'accès entre deux couches.

> **C4 → Segment · C3 → Paquet · C2 → Trame · C1 → Bits**

## 06 · Schéma d'une trame complète

La donnée applicative est emboîtée couche après couche : le contenu d'une couche devient la charge utile de celle du dessous.

\`\`\`
[ Données applicatives ]                         ← Application
[ En-tête TCP/UDP | Données ]                    ← Transport (Segment)
[ En-tête IP | Segment ]                         ← Internet (Paquet)
[ @MAC dst(6o) | @MAC src(6o) | FT(2o) | Paquet IP(46-1500o) | FCS(4o) ]  ← Accès réseau (Trame)
\`\`\`

@MAC dans la trame (C2), @IP dans le paquet (C3), ports dans le segment (C4).
**Trame totale = 64 à 1518 octets** (données 46–1500). Le **FCS** contrôle l'intégrité, le **FT** identifie le protocole supérieur.

| Identifiant | Valeur |
| --- | --- |
| FT IPv4 | \`0x0800\` |
| FT ARP | \`0x0806\` |
| IP Protocol TCP | \`6\` |
| IP Protocol UDP | \`17\` |
| IP Protocol ICMP | \`1\` |

## 07 · L'adresse MAC

Adresse **physique**, unique au monde, gravée dans la carte réseau. **6 octets = 48 bits**, en hexadécimal (ex. \`00-A0-B5-01-BE-C5\`).
3 octets OUI (constructeur) + 3 octets NIC (numéro de série).

| Mode | Cible | Exemple | Bit I/G |
| --- | --- | --- | --- |
| Unicast | Une machine (1→1) | \`60:57:18:D7:9F:C4\` | 0 |
| Multicast | Un groupe (1→groupe) | \`01:00:5E:xx:xx:xx\` | 1 |
| Broadcast | Tous (1→tous) | \`FF:FF:FF:FF:FF:FF\` | 1 |

> Repères : A–F = hexadécimal · \`FF\` = 255 = octet tout à 1 → broadcast · bit I/G à 0 = unicast, à 1 = multicast/broadcast.

## 08 · Méthodes d'accès au canal — CSMA

La couche Liaison gère 3 mécanismes : (1) accès au canal, (2) adressage physique (MAC), (3) détection des erreurs (via FCS, sans correction).

- **CSMA/CD** — Ethernet (filaire). … / Collision **Detection** : on écoute, on émet, on détecte la collision, on réémet.
- **CSMA/CA** — Wi-Fi (sans fil). … / Collision **Avoidance** : on cherche à éviter les collisions en amont.

## 09 · Supports de transmission

- **Cuivre** — paire torsadée (RJ45). Signal électrique. Catégories 5 à 8 : de 100 Mb/s à 40 Gb/s sur quelques dizaines de mètres.
- **Fibre optique** — cœur en verre/plastique, conduit la lumière. Jusqu'à 200 Gb/s sur plusieurs km. Insensible aux perturbations.
- **Air / vide** — ondes électromagnétiques. Wi-Fi, faisceau hertzien, liaison satellite.

> **Câblage cuivre** : câble **droit** = relier deux matériels **différents** (PC↔switch) · câble **croisé** = relier deux matériels **identiques** (PC↔PC, switch↔switch).

## 10 · Les 3 modes d'exploitation

| Mode | Sens | Exemple |
| --- | --- | --- |
| Simplex | Unidirectionnel (un seul sens) | Radio, TV |
| Half-Duplex | Bidirectionnel à l'alternat | Talkie-walkie |
| Full-Duplex | Bidirectionnel simultané | Téléphone |

## 11 · Adresse IPv4 & binaire

Une @IPv4 est **logique**, unique sur le réseau logique, **32 bits = 4 octets**, en décimal pointé, associée à un masque. Deux parties : **NET-ID** (réseau) + **HOST-ID** (machine).

Poids des bits (1 octet) : **128 · 64 · 32 · 16 · 8 · 4 · 2 · 1**

\`\`\`
# Binaire → décimal (on additionne les poids des bits à 1)
1011 0110 = 128 + 32 + 16 + 4 + 2 = 182
# Décimal → binaire (on retire les poids du plus grand au plus petit)
195 = 128 + 64 + 2 + 1 = 1100 0011
\`\`\`

> Valeurs utiles : 1=00000001 · 126=01111110 · 240=11110000 · 255=11111111.

## 12 · Le masque & la notation CIDR

Le masque : 4 octets, décimal pointé, succession de **1 PUIS de 0** (jamais mélangés). Nb de bits à 1 = taille du NET-ID = notation **CIDR** \`/n\`.

\`\`\`
255.255.240.0 = 11111111.11111111.11110000.00000000
              =    8    +    8    +    4    +    0    = /20
\`\`\`

| CIDR | Masque |
| --- | --- |
| /8 | 255.0.0.0 |
| /16 | 255.255.0.0 |
| /24 | 255.255.255.0 |
| /25 | …128 · /26 …192 · /27 …224 · /28 …240 |

> **⚠️ Masque invalide** — un octet ne peut PAS mélanger 1 et 0. Valeurs possibles uniquement : 0 · 128 · 192 · 224 · 240 · 248 · 252 · 254 · 255.

## 13 · Adresses particulières & privées

**Privées (non routées)** — librement utilisables, traduites par NAT pour sortir :
- \`10.0.0.0/8\`
- \`172.16.0.0/12\`
- \`192.168.0.0/16\`

**Réservées** :
- Loopback : \`127.x.x.x\` (la machine elle-même)
- Route par défaut / @ nulle : \`0.0.0.0/0\`
- @réseau (machine à 0) et @broadcast (machine à 1) : jamais attribuées à une station.

> IPv4 épuisée depuis décembre 2019 → solutions : sous-réseaux et IPv6 (16 octets).

## 14 · Calculer @réseau & @broadcast

**@réseau** = tous les bits de la partie machine à **0**. **@broadcast dirigé** = tous les bits machine à **1**.

**La méthode du « pas »** : pas = 256 − (octet du masque où passe la frontière). Les @réseau se suivent de pas en pas, broadcast = (réseau suivant − 1).

| CIDR | Octet masque | Pas | Octet |
| --- | --- | --- | --- |
| /25 | 128 | 128 | 4e |
| /26 | 192 | 64 | 4e |
| /27 | 224 | 32 | 4e |
| /28 | 240 | 16 | 4e |
| /20 | 240 | 16 | 3e |
| /18 | 192 | 64 | 3e |

\`\`\`
# 192.93.10.36 /27 → masque .224 → pas de 32 sur le 4e octet
# multiples de 32 : 0, 32, 64… → 36 tombe dans le bloc qui commence à 32
@réseau    = 192.93.10.32
@broadcast = (suivant 64) − 1 = 192.93.10.63

# 128.192.5.5 /18 → masque 3e octet .192 → pas de 64 sur le 3e octet
@réseau    = 128.192.0.0
@broadcast = (suivant 64) − 1 = 128.192.63.255
\`\`\`

> **Formule clé** — @ utilisables = 2^(bits machine) − 2 (on retire @réseau et @broadcast). Ex. /18 → 32−18 = 14 bits → 2^14 − 2 = 16382.

## 15 · Le subnetting (découpage)

Découper un réseau en plusieurs sous-réseaux en **empruntant des bits côté machine** (HOST-ID), ce qui agrandit le masque.

- **FLSM** (découpage) : sous-réseaux de taille identique (méthode du cours).
- **VLSM** : masque variable selon le nombre de machines de chaque SR (évite le gaspillage).

| Bits empruntés | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Sous-réseaux (2ⁿ) | 2 | 4 | 8 | 16 | 32 | 64 |

**Méthode** : 1) combien de SR ? 2) n bits tq 2ⁿ ≥ voulu 3) nouveau masque /(p+n) 4) pas = 256 − octet 5) lister (@réseau puis broadcast = suivant − 1).

\`\`\`
# A — 192.168.1.0/24 en 4 SR → 2 bits → /26 → pas 64
SR1 192.168.1.0/26    bc .63
SR2 192.168.1.64/26   bc .127
SR3 192.168.1.128/26  bc .191
SR4 192.168.1.192/26  bc .255

# C — 192.168.0.0/16 en 5 SR → 3 bits (2³=8 ≥ 5) → /19 → pas 32 (3e octet)
SR1 192.168.0.0/19    bc 192.168.31.255
SR2 192.168.32.0/19   bc 192.168.63.255
...
\`\`\`

> **⚠️ Piège** — l'adresse donnée n'est pas toujours une @réseau ! Ex. \`192.168.6.0/22\` est une @machine : trouve d'abord la vraie @réseau (/22 → pas 4 sur le 3e octet → \`192.168.4.0/22\`) avant de découper.

## 16 · TCP vs UDP (couche Transport)

| Critère | TCP | UDP |
| --- | --- | --- |
| Connexion | Connecté (3 phases) | Non connecté |
| Fiabilité | Fiable (accusés, retransmission) | Non fiable |
| Vitesse | Lent | Rapide |
| Usages | Web, FTP, SSH | TFTP, VoIP, jeux en réseau |
| IP Protocol | 6 | 17 |

> **Image** — TCP = appel téléphonique (on vérifie que l'autre suit). UDP = lettre postée : rapide, mais aucune confirmation.

## 17 · Les ports

Un port = extension de l'adresse : il identifie le service/application visé. Couplé à l'@IP = « point de communication ».

| Catégorie | Plage | Usage |
| --- | --- | --- |
| Well-known | 0 – 1023 | Services répandus |
| Registered | 1024 – 49151 | Demandes spécifiques |
| Dynamic / privés | 49152 – 65535 | Besoins temporaires |

| Service | Port | Service | Port |
| --- | --- | --- | --- |
| HTTP | 80 | DNS | 53 (UDP/TCP) |
| HTTPS | 443 | SMTP | 25 |
| SSH | 22 | POP3 | 110 |
| TELNET | 23 | IMAP | 143 |
| FTP | 20 / 21 | TFTP | 69 (UDP) |

> FTP : 20 = transfert, 21 = contrôle.

## 18 · Protocoles utiles

| Protocole | Couche | Rôle |
| --- | --- | --- |
| ARP | 2 (utilise infos de 3) | @IP → @MAC (FT 0x0806). Requête broadcast, réponse unicast |
| ICMP | 3 (Internet) | Messages de contrôle/erreur. Fait fonctionner le ping |
| DHCP | Application | Attribue automatiquement @IP, masque, passerelle, DNS |
| DNS | Application | Traduit nom de domaine ↔ @IP |
| NAT | Internet | Traduit privé ↔ public (box / routeur) |
| HTTP | Application | Pages web (client ↔ serveur) |

## 19 · ICMP · PING · TTL · Wireshark

ICMP (couche 3, IP Protocol \`0x01\`) signale erreurs et teste la connectivité. Le **ping** utilise ICMP : **Type 8 / Code 0** = echo request, **Type 0 / Code 0** = echo reply.

| Message ping | Cause probable |
| --- | --- |
| Défaillance générale | Câble · pas d'@IP · hors réseau logique sans passerelle |
| Impossible de joindre l'hôte | @IP du même réseau mais injoignable, ou passerelle KO |
| Délai d'attente dépassé | Requête ARP partie, aucun retour |
| TTL expiré | Boucle de routage |

**TTL (Time To Live)** : résout les boucles de routage. Décrémenté à chaque routeur ; à 0 le datagramme est détruit et un message repart vers l'émetteur (\`64 → 63 → … → 0\`).

> **⚠️ Wireshark** = analyseur de trafic. Sur les réseaux de la Défense, usage **INTERDIT** sauf ordre écrit, passible de sanctions pénales. En cours : uniquement sur plateformes d'instruction isolées.

## 20 · Équipements réseau

ES (End System) utilise les 7 couches OSI. IS (Intermediate System) n'utilise que les premières.

| Équipement | Couche | Rôle |
| --- | --- | --- |
| Hub (concentrateur) | 1 — Physique | Répète le signal vers tous les ports (pas d'aiguillage) |
| Switch (commutateur) | 2 — Liaison | Interconnecte un même LAN via les @MAC |
| Routeur (passerelle) | 3 — Réseau | Interconnecte des réseaux différents, route via les @IP |

## 21 · Mémo express

**Tailles** : @MAC = 48 bits / 6 o (hexa) · @IPv4 = 32 bits / 4 o · IPv6 = 16 o · 1 octet = 8 bits (0–255) · Trame Ethernet 64–1518 o (données 46–1500) · Ports well-known 0–1023.

**Calcul** : @réseau → machine à 0 · @broadcast → machine à 1 · pas = 256 − octet du masque · @ utilisables = 2^(bits machine) − 2 · subnet : n bits → 2ⁿ SR · poids 128·64·32·16·8·4·2·1.

**Emboîtement** : Données → (+ en-tête transport) Segment → (+ @IP) Paquet → (+ @MAC + FCS) Trame → bits.

**Codes** : FT \`0x0800\` = IP · FT \`0x0806\` = ARP · IP-proto 6 = TCP · 17 = UDP · 1 = ICMP.`;

// ─── Flashcards de base ──────────────────────────────────────────────────────────
export const LINUX_CARDS: { question: string; answer: string }[] = [
  { question: 'Quel raccourci désigne le dossier personnel de l\'utilisateur ?', answer: '~ (tilde) — ex. /home/p.nom' },
  { question: 'Que fait `ls -la` ?', answer: 'Liste tout, fichiers cachés inclus, au format détaillé.' },
  { question: 'Quelle option de `mkdir` crée toute la chaîne de parents manquants ?', answer: '-p (ex. mkdir -p a/b/c)' },
  { question: 'Différence entre `>` et `>>` ?', answer: '> écrase le fichier, >> ajoute à la suite.' },
  { question: 'Comment jeter les erreurs d\'une commande ?', answer: '2> /dev/null' },
  { question: 'Comment suivre un log en temps réel ?', answer: 'tail -f fichier' },
  { question: 'Dans vim, comment quitter sans sauvegarder ?', answer: 'Échap puis :q!' },
  { question: 'Que fait le tube `|` ?', answer: 'Branche la sortie d\'une commande sur l\'entrée de la suivante.' },
  { question: 'Structure de la commande find ?', answer: 'find [où] [critères] [action]' },
  { question: 'Combien de champs dans /etc/passwd, quel séparateur ?', answer: '7 champs séparés par « : » (nom, mdp, UID, GID, GECOS, dossier, shell).' },
  { question: 'Que signifie UID 0 ?', answer: 'L\'utilisateur root (superutilisateur).' },
  { question: 'Que fait `grep -v motif` ?', answer: 'Affiche les lignes qui NE contiennent PAS le motif.' },
];

export const RESEAU_CARDS: { question: string; answer: string }[] = [
  { question: 'Combien de couches dans OSI et dans TCP/IP ?', answer: 'OSI = 7 couches, TCP/IP = 4 couches.' },
  { question: 'Mnémo OSI (bas → haut) ?', answer: 'Pour Le Réseau Tout Se Passe Automatiquement (Physique, Liaison, Réseau, Transport, Session, Présentation, Application).' },
  { question: 'Taille d\'une adresse MAC ?', answer: '48 bits = 6 octets (hexadécimal). 3 o OUI + 3 o NIC.' },
  { question: 'Taille d\'une adresse IPv4 ? IPv6 ?', answer: 'IPv4 = 32 bits / 4 octets. IPv6 = 16 octets.' },
  { question: 'Adresse de broadcast Ethernet ?', answer: 'FF:FF:FF:FF:FF:FF' },
  { question: 'Taille d\'une trame Ethernet ?', answer: '64 à 1518 octets (données 46–1500).' },
  { question: 'Formule du nombre d\'adresses utilisables ?', answer: '2^(bits machine) − 2 (on retire @réseau et @broadcast).' },
  { question: 'Comment calcule-t-on le « pas » ?', answer: 'pas = 256 − octet du masque où passe la frontière.' },
  { question: '@réseau et @broadcast : quels bits machine ?', answer: '@réseau = bits machine à 0, @broadcast = bits machine à 1.' },
  { question: 'Différence clé TCP vs UDP ?', answer: 'TCP = connecté et fiable (lent), UDP = non connecté non fiable (rapide).' },
  { question: 'Ports HTTP, HTTPS, SSH, DNS ?', answer: 'HTTP 80, HTTPS 443, SSH 22, DNS 53.' },
  { question: 'Rôle d\'ARP et son fonctionnement ?', answer: '@IP → @MAC. Requête en broadcast, réponse en unicast (FT 0x0806).' },
  { question: 'À quoi sert le TTL ?', answer: 'Résoudre les boucles de routage : décrémenté à chaque routeur, datagramme détruit à 0.' },
  { question: 'Les 3 plages d\'adresses privées ?', answer: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.' },
  { question: 'Valeurs valides d\'un octet de masque ?', answer: '0, 128, 192, 224, 240, 248, 252, 254, 255 (jamais 1 et 0 mélangés).' },
  { question: 'CSMA/CD vs CSMA/CA ?', answer: 'CD = Collision Detection (Ethernet filaire), CA = Collision Avoidance (Wi-Fi).' },
  { question: 'Couche et rôle d\'un switch vs routeur ?', answer: 'Switch : couche 2, via @MAC dans un LAN. Routeur : couche 3, via @IP entre réseaux.' },
  { question: 'Codes FT et IP-proto à connaître ?', answer: 'FT 0x0800 = IPv4, 0x0806 = ARP ; IP-proto 6 = TCP, 17 = UDP, 1 = ICMP.' },
];
