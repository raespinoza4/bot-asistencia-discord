const fs = require('fs');
const Discord = require('discord.js')
const client = new Discord.Client({ ws: { intents: Discord.Intents.NON_PRIVILEGED } });
require('dotenv').config();

// Bot escrito por Rodrigo Espinoza con <3 inicialmente para el ramo introduccion a la progamacion (IIC1103) en PUC

const {google} = require('googleapis');

// Por seguridad utilizamos variables de entorno para el token y prefix de discord
// Ver documentacion para saber cuales settear !

const prefix = process.env.PREFIX;
const token = process.env.TOKEN;

// Cuidado !!! No subir google-credentials.json 
// Hay un webpack muy util para configurar el .json en heroku de manera segura ! (en caso de usar heroku)

const keys = require('./google-credentials.json')

const client2 = new google.auth.JWT(
      keys.client_email,
      null,
      keys.private_key,
      ['https://www.googleapis.com/auth/spreadsheets'],
);

// Funcion para utilizar la API de google sheets
async function gswriteassitanceAlumno(client, data) {

    const gsapi = google.sheets({version:'v4', auth: client});


    const appendOptions = {
        spreadsheetId: '', // Completar con el ID
        range: '', // Completar con el rango
        valueInputOption: 'USER_ENTERED',resource: { values: data},
    };

    let res = await gsapi.spreadsheets.values.append(appendOptions);
    // Para testear:
    // console.log(res)
}

client.commands = new Discord.Collection();

const cooldowns = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));


// Obtencion de comandos hechos en commands (avanzado)
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command)
}

client.once('ready', () => {
    console.log("Pythoncita is online !");
});

client.on('message', message => {

    // Verificamos si tiene el prefijo seleccionado
    if (!message.content.startsWith(prefix) || message.author.bot) return;


    // Obtenemos las partes del mensaje
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const infoHelp = message.content.slice(prefix.length).trim();
    const commandName = args.shift().toLowerCase();

    ////////////////////////////////////////////////////
    //   Primera forma de ejecutar comandos (facil)  //
    //////////////////////////////////////////////////

    console.log("Llego un mensaje !!!");
    console.log(message);


    // Checkeamos el nombre del comando
    if (message.content === '$asistencia') {
        // Utilizamos el id del rol
        // Permite que solo los alumnos puedan utilizar este comando
        alumno_role_id = "739740728246272042"
        if (message.member.roles.cache.has(alumno_role_id)) {

            // Obtenemos la fecha actual
            let d = new Date();
            let days = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Domingo"];
            let months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
            let time = d.getHours().toString() + ":" + d.getMinutes().toString() + ":" + d.getSeconds().toString(); 

            // Escribimos en planilla utilizando API de google sheets
            client2.authorize((err, tokens) => {
        
                if (err) {
                    console.log(err);
                    return;
                } else {
                    return gswriteassitanceAlumno(client2, [[message.author.username, days[d.getDay()], d.getDate(), months[d.getMonth()], time]]);
                }
            });
            message.reply("He registrado correctamente tu asistencia ✅")
        }
        else {
            message.reply("Debes ser alumno para utilizar este comando ❌")
        }
    }

    // Comando que simula a un usuario ingresando al servidor
    if (message.content === '$join') {
        message.delete(1000);
		return client.emit('guildMemberAdd', message.author);
	}


    // Si el mensaje enviado por el usuario no tiene un comando, retorna
    if (!client.commands.has(commandName)) return;

    ////////////////////////////////////////////////////
    // Segunda forma de ejecutar comandos (avanzado) //
    //////////////////////////////////////////////////

    const command = client.commands.get(commandName)

    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply("No puedo ejecutar este comando en un chat privado, debes usarlo en el canal correspondiente :)")
    }

    if (command.args && !args.length) {
        let reply = `No pusiste los argumentos necesarios ! ${message.author}`;

        if (command.usage) {
            reply += `\nLa forma correcta de usar el comando es: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);

    }

    
    // Agregamos un cooldown a los comandos (se debe agregar el atributo en el js respectivo)

    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
    
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`Por favor espera ${timeLeft.toFixed(1)} segundo(s) mas antes de volver a usar el comando \`${command.name}\``);
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);


    // Finalmente ejecutamos el comando
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('Ocurrió un error al momento de ejecutar el comando :(');
    }
});

client.login(token);