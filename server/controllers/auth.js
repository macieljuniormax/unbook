import User from "../models/user";
import {hashPassword, comparePassword} from "../helpers/auth";
import jwt from "jsonwebtoken";
import validator from "validator"
import { nanoid } from 'nanoid'

export const register = async (req, res) => {
    // console.log("REGISTER ENDPOINT =>", req.body);
    const {name, email, password, secret} = req.body;

    // validacoes
    if(!name){
        return res.json({
            error:"Campo nome não preenchido!",
        });
    }
    if(!password || password.length < 8){
        return res.json({
            error:"A senha deve possuir ao menos 8 caracteres.",
        });
    }
    if(!secret){
        return res.json({
            error:"É necessário responder a pergunta.",
        });
    }
    if(!validator.isEmail(email) || !(email.endsWith("@aluno.unb.br") || email.endsWith("@unb.br"))){
        return res.json({
            error:"Insira um e-mail válido.",
        });
    }
    const exist = await User.findOne({email});
    if(exist){
        return res.json({
            error:"Email já cadastrado.",
        });
    }

    // criptografar senha
    const hashedPassword = await hashPassword(password);

    //criando o usuario
    const user = new User({
        name,
        email, 
        password:hashedPassword, 
        secret,
        userName: nanoid(6),
    });
    try{
        await user.save();
        // console.log("USUARIO SALVO =>", user);
        return res.json({ 
            ok: true, 
        });
    }catch (err){
        console.log("FALHA NO REGISTRO =>", err);
        return res.status(400).send("Erro. Tente novamente.");
    }
};

export const login = async (req, res) => {
    // verificando se esta recebendo os dados
    //console.log(req.body);
    try{
        // verificando se o email existe na db
        const{ email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user){
            return res.json({
                error:"Usuário não encontrado.",
            });
        }
        // verificando a senha
        const match = await comparePassword(password, user.password);
        if(!match){
            return res.json({
                error:"Senha incorreta.",
            });
        }
        // criando um token sinalizador
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: "7d"});
        user.password = undefined;
        user.secret = undefined;
        res.json({
            token,
            user,
        })
    } catch(err){
        console.log(err);
        return res.status(400).send("Erro.Tente novamente.");

    }
};

export const currentUser = async(req, res) => {
    try {
      const user = await User.findById(req.auth._id).select("-password");
      // res.json(user)
      res.json({ ok: true });
    } catch (err) {
      console.log(err);
      res.sendStatus(400);
    }
}

export const forgotPassword = async(req, res) =>{
    //console.log(req.body);
    const{ email, newPassword, secret} = req.body;
    //Validacao
    if(!newPassword || !newPassword <8){
        return res.json({
            error: "A senha deve possuir ao menos 8 dígios.",
        });
    }
    if(!secret){
        return res.json({
            error: "A pergunta deve ser respondida.",
        });
    }
    const user = await User.findOne({ email, secret});
    if(!user){
        return res.json({
            error: "Dados inseridos estão incorretos.",
        });
    }

    try{
        const hashed = await hashPassword(newPassword);
        await User.findByIdAndUpdate(user._id, { password: hashed});
        return res.json({
            sucess: "Senha atualizada com sucesso!",
        });
    }catch (err){
        console.log(err);
        return res.json({
            error:"Algo deu errado. Tente novamente.",
        });
    }
};

export const profileUpdate = async (req, res) => {
    try {
        // console.log("profile update req.body", req.body);
        const data = {};

        if(req.body.userName) {
            data.userName = req.body.userName;
        }
        if(req.body.about) {
            data.about = req.body.about;
        }
        if(req.body.name) {
            data.name = req.body.name;
        }
        if(req.body.password) {
            if(req.body.password.length < 8) {
                return res.json({
                    error: "A senha deve possuir pelo menos 8 caracteres"
                })
            } else {
                data.password = await hashPassword(req.body.password);
            }
        }
        if(req.body.secret) {
            data.secret = req.body.secret;
        }

        let user = await User.findByIdAndUpdate(req.auth._id, data, { new: true });
        // console.log(user);
        user.password = undefined;
        user.secret = undefined;
        res.json(user);
    } catch (err) {
        if(err.code == 11000) {
            return res.json({error: "Username duplicado"});
        }
        console.log(err);
    }
}