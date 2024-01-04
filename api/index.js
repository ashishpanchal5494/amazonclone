const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');




const cors = require('cors');




const jwt = require("jsonwebtoken");

mongoose.connect("mongodb+srv://ashishpanchal199:8mEgh0405I6wpiES@cluster0.k7utczn.mongodb.net/?retryWrites=true&w=majority",{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to mongodb");
}).catch((err) => {
    console.log("Error connecting to mongodb" + err)
})



// app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());


app.listen(8000, () => {
    console.log("Server is running on port 8000")
})

const User = require("./models/user");
const Order = require("./models/order");

// function to send verification email to user 
const sendVerificationEmail = async(email, verificationToken) => {
    // create a nodemailer transport

    const transporter = nodemailer.createTransport({
        // configure the email service 
        service: "gmail",
        auth: {
            user:"ashishpanchal199@gmail.com",
            pass:"qqly lyop yzua yhbm"
        }
    })

    // compose the email massage 
    const mailOptions = {
        from : "amazon.com",
        to:email,
        subject:"Email varification",
        text:`Please click the following link to verify your email : http://localhost:8000/verify/${verificationToken}`, 
    };

    // send the email 
    try{
        await transporter.sendMail(mailOptions)
    }catch(error){
        console.log("Error sending verification email", error)
    }
}

app.get("/", (req, res) => {
    res.send("hello from the server")
})


// endpoint to register in the app 
app.post("/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      
   if(!name ||!email || !password) {
    return res.status(422).json({error: "Plz failed the field properly"})
   }
  
      // Check if the email is already registered
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        console.log("Email already registered:", email); // Debugging statement
        return res.status(400).json({ message: "Email already registered" });
      }
  
    //   // Create a new user
      const newUser = new User({ name, email, password });
  
    //   // Generate and store the verification token
      newUser.verificationToken = crypto.randomBytes(20).toString("hex");
  
    //   // Save the user to the database
      await newUser.save();
  
    //   // Debugging statement to verify data
      console.log("New User Registered:", newUser);
  
    //   // Send verification email to the user
    //   // Use your preferred email service or library to send the email
      sendVerificationEmail(newUser.email, newUser.verificationToken);
  
      res.status(201).json({
        message:
          "Registration successful. Please check your email for verification.",
      });
    } catch (error) {
      console.log("Error during registration:", error); // Debugging statement
      res.status(500).json({ message: "Registration failed" });
    }
  });
  

// endpoint to verify the email
app.get("/verify/:token", async (req, res) => {
    try{
        const token = req.params.token;

        // find the user with the given verification token
        const user = await User.findOne({verificationToken: token})
        if(!user){
            return res.status(404).json({message: "Invalid verification token"})
        }

        // mark the user as verified
        user.verified = true;
        user.verificationToken = undefined;

        await user.save();

        res.status(200).json({message: "Email verified successfully"})
    }catch(error) {
        res.status(500).json({message:"Email verification failed"})
    }
})

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex")

  return secretKey;
}

const secretKey = generateSecretKey()

app.post("/login", async (req, res) => {
  try{
    const {email, password} = req.body;

    const user = await User.findOne({email: email})
    if(!user){
      return res.status(401).json({message: "invalid email or password"})
    }

    // check if the pasword is correct
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // generate a token 
    const token = jwt.sign({userId:user._id}, secretKey)

    res.status(200).json({token})
   } catch(error) {
    res.status(500).json({message: "Login Failed"});
  }
})

// endpoint to store a new address to the backend
app.post("/addresses", async (req, res) => {
  try{
    const {userId, address} = req.body;

    // find the user by the Userid
    const user = await User.findById(userId);
    if(!user) {
      return res.status(404).json({message: "User not found"});
    }

    // add the new address to the user's addresses array
    user.addresses.push(address);

    // save the updates user in the backend
    await user.save();

    res.status(200).json({message: "Address created Successfully"});
  }catch(error) {
    res.status(500).json({message: "Error adding address"});
  }
})

// endpoint to get all the addresses of a particular user
app.get("/addresses/:userId", async (req, res) => {
  try{
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if(!user){
      return res.status(404).json({message: "User not found"});
    }

    const addresses = user.addresses;
    res.status(200).json({addresses}) 
  } catch(error) {
    res.status(500).json({message: "Error retrieving addresses"});
  }
})


//endpoint to store all the orders
app.post("/orders", async (req, res) => {
  try {
    const { userId, cartItems, totalPrice, shippingAddress, paymentMethod } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //create an array of product objects from the cart Items
    const products = cartItems.map((item) => ({
      name: item?.title,
      quantity: item.quantity,
      price: item.price,
      image: item?.image,
    }));

    //create a new Order
    const order = new Order({
      user: userId,
      products: products,
      totalPrice: totalPrice,
      shippingAddress: shippingAddress,
      paymentMethod: paymentMethod,
    });

    await order.save();

    res.status(200).json({ message: "Order created successfully!" });
  } catch (error) {
    console.log("error creating orders", error);
    res.status(500).json({ message: "Error creating orders" });
  }
});