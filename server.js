const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const colors = require('colors');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectID;
const bodyParser = require('body-parser');
const randomString = require('randomstring');
mongoose.connect('mongodb://localhost:27017/Tapply', {useNewUrlParser: true, useUnifiedTopology: true});
const connection = mongoose.connection;
const cors = require('cors');

console.log('--------------------------------'.red);
console.log('Welcome to '.green+'Tapply'.red+' WebSocket server'.green);



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('json spaces', 4);
app.use(cors({origin: 'http://localhost:8100'}));



/*Pobranie danych usera po id*/
app.get("/api/users/:id?", (req, res)=>{
    connection.db.collection("Users", function(err, UsersCollection){
          if(req.query.id){
            let o_id = new ObjectId(req.query.id);
            UsersCollection.find({_id:o_id}).toArray(function(err, data){
              if(err) console.log("err");
              return res.json(data); 
            }) 
          }
    });
});


app.post("/api/users/new", (req, res)=>{
  res.json({username:req.body.username, email: req.body.email});
  /*DO ZROBIENIA Sprawdzanie czy user/email istnieje w bazie, sprawdzanie czy pola nie sa puste*/
  connection.db.collection("Users", (err, UsersCollection)=>{
    if(err) console.log("err")
    UsersCollection.insertOne({username:req.body.username, email: req.body.email}, (err, res)=>{
      return true;
    });
  })
console.log(`Odebrano dane POST:\nUsername: ${req.body.username}\nemail:${req.body.email}`);  
});



app.put("/api/users/edit:username?", (req,res)=>{
  /*DO ZROBIENIA Sprawdzenie czy user istnieje w bazie*/
  connection.db.collection("Users", (err, UsersCollection)=>{
    UsersCollection.updateOne({ username: req.query.username },
      [
         { $set: { username: req.body.newUsername } },
      ]);
  });
  return res.json(req.query.username);
});


/*Autoryzacja za pomocą formularza*/
app.get("/api/auth/:username?/:psw?", (req, res)=>{
  if(!req.query.username || !req.query.psw){
    return res.json({error:true, auth:false, msg: "Empty login or password value"});
  }else{
    connection.db.collection("Users", (err, UsersCollection)=>{
        UsersCollection.find({username:req.query.username, psw:req.query.psw}).toArray((err,data)=>{
          if(err){
            return res.json({error:true, auth:false, msg: err});
          }else{
            if(!data[0]){
              return res.json({error:true, auth:false, msg:"Incorrect username or password"});
            }else{
              let handshake = randomString.generate();
              UsersCollection.updateOne({_id:data[0]._id},
                [
                  { $set: { handshake: handshake }}
                ]);
              return res.json({error:false, auth:true, id:data[0]._id, handshake:handshake, msg:"OK"});
            }
          }
        });
      });
  }
});

/*Autoryzacja danych z WebStorage klienta*/
app.get("/api/authStorage/:id?/:handshake?", (req,res)=>{
  console.log('ktos pyknal');
  let o_id = new ObjectId(req.query.id); /*Zmiana stringa ID na objektID(wymagane do szukania w find() po _id*/
  connection.db.collection("Users", (err, UsersCollection)=>{
    if(err) return res.json({error:true, auth:false, msg: err});
    UsersCollection.find({_id:o_id, handshake:req.query.handshake}).toArray((err,data)=>{
      if(!data[0]){
        return res.json({error:true, auth:false, msg:"Cannot find user"});
      }else{
        return res.json({error:false, auth:true, id:req.query.id, handshake:req.query.handshake, msg:"OK"});
      }
    });
   });
});




/* Pobieranie konwersacji po id*/
app.get("/api/conversation/:id?", (req, res)=>{
  connection.db.collection("conversations", function(err, ConversationCollection){
        if(req.query.id){
          let o_id = new ObjectId(req.query.id);
          ConversationCollection.find({_id:o_id}).toArray(function(err, data){
            if(err) console.log("err");
            return res.json(data); 
          }) 
        }
  });
});




http.listen(3000, function(){
  console.log('Listening on localhost:3000');
});