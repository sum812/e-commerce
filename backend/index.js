const port = 4000;
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

app.use(express.json());
app.use(cors());

// connect
mongoose.connect("mongodb+srv://sssum812:4C0p2CQbp9b4ubHE@cluster0.govlm8r.mongodb.net/2-hand-ecommerce");

// api creation
app.get("/", (req, res) => {
    res.send('Express app is running');
});

// image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// creating upload endpoint for images
app.use('/images', express.static('upload/images'))

app.post('/upload', upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
});

// schema for creating products
const Product = mongoose.model('Product', {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 0;
    }

    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    await product.save();
    console.log('Saved');
    res.json({
        success: true,
        name: req.body.name,
    })
});

// creating api for deleting product
app.delete('/deleteproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log('Deleted');
    res.json({
        success: true,
        name: req.body.name,
    });
});

// creating api for getting all products
app.get('/allproducts', async (req, res) => {
    let all_products = await Product.find({});
    res.send(all_products);
});

// schema creating for user model 
const Users = mongoose.model('Users', {
    username: {
        type: String,
        require: ['true', 'Not empty']
    },
    email: {
        type: String,
        unique: true,
        require: ['true', 'Not empty']
    },
    password: {
        type: String,
        require: ['true', 'Not empty']
    },
    cartData: {
        type: Object
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// creating endpoint for regestering the user 
app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, error: "Existing user found with same email address" });
    }

    let cart = {};

    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }

    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    });

    await user.save();

    const data = {
        user: {
            id: user.id,
        }
    }

    // secret_ecom
    const token = jwt.sign(data, 'supper_secret_key');

    res.json({ success: true, token })
});

// creating endpoint for user login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });

    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            };

            const token = jwt.sign(data, 'supper_secrect_key');
            res.json({ success: true, token });
        } else {
            res.json({ success: false, error: "Wrong password" });
        }
    } else {
        return res.status(400).json({ success: false, error: "User not found" })
    }
});

// creating endpoint for newcollection data 
app.get('/newcollection', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    res.send(newcollection);
});

// creating endpoint for popular in women
app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" });
    let popular_in_women = products.slice(0, 4);
    res.send(popular_in_women);
});

// creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Please authenticate using a valid token" })
    } else {
        try {
            const data = jwt.verify(token, 'supper_secrect_key');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ error: "Please authenticate using a valid token" })
        }
    }
};

// creating endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Add ok");
});

// creating endpoint for remove products in cartdata
app.post('/removefromcart', fetchUser, async (req, res) => {
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Remove ok");
});

// creating endpoint to get cartdata
app.post('/getcart', fetchUser, async (req, res) => {
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
});

app.listen(port, (error) => {
    if (!error) {
        console.log('Server running on Port ' + port);
    } else {
        console.log('Error: ' + error);
    }
});