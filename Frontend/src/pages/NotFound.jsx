import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";
import { LucideMoveLeft, AlertCircle, UtensilsCrossed, ChefHat, Soup } from "lucide-react";
import { motion } from "framer-motion";

import React, { useEffect, useState } from "react";
import "../styles/animations.css";
import logoImg from "../assets/images/logo.png";

const NotFound = () => {
  useEffect(() => {
    document.title = "RestOS | Not Found";
  }, []);
  const { theme } = useTheme();
  const [particles, setParticles] = useState([]);
  const accentColor = "#F6b100"; // Restaurant theme accent color
  
  // Generate random particles for background effect
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 20; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 10 + 5,
          duration: Math.random() * 20 + 10
        });
      }
      setParticles(newParticles);
    };
    
    generateParticles();
  }, []);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.3,
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
  };
  
  const buttonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { delay: 1, duration: 0.5 } },
    hover: { scale: 1.05, boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)", transition: { duration: 0.3 } }
  };
  
  const particleVariants = {
    animate: (custom) => ({
      x: [custom.x + "%", (custom.x + 10) + "%", custom.x + "%"],
      y: [custom.y + "%", (custom.y + 5) + "%", custom.y + "%"],
      transition: {
        duration: custom.duration,
        repeat: Infinity,
        ease: "easeInOut"
      }
    })
  };

  return (
    <motion.main 
      className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-[var(--main-bg)] text-[var(--text-color)] relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Particle background effect */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          custom={particle}
          variants={particleVariants}
          animate="animate"
          className="absolute rounded-full bg-[#F6b100] opacity-20"
          style={{
            width: particle.size + 'px',
            height: particle.size + 'px',
            left: particle.x + '%',
            top: particle.y + '%',
            filter: 'blur(1px)'
          }}
        />
      ))}
      
      <motion.div 
        className="rounded-lg p-8 max-w-md w-full backdrop-blur-sm bg-[var(--card-bg)] bg-opacity-50 border border-[var(--border-color)] shadow-lg"
        variants={containerVariants}
      >
        <motion.div
          className="flex items-center justify-center mb-6"
          variants={itemVariants}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 10,
                duration: 0.8
              }
            }}
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
          >
            <motion.h1 
              className="text-7xl font-bold animate-glow text-[#F6b100]"
            >
              404
            </motion.h1>
            <motion.div 
              className="absolute -top-4 -right-4"
              animate={{ 
                rotate: [0, 10, 0, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity,
                repeatType: "loop" 
              }}
            >
              <UtensilsCrossed className="h-8 w-8 text-[#F6b100]" />
            </motion.div>
          </motion.div>
        </motion.div>
        
        <motion.div className="flex justify-center mb-4" variants={itemVariants}>
          <img src={logoImg} alt="Restaurant Logo" className="h-12 w-auto" />
        </motion.div>

        <motion.h2 
          className="mb-4 text-2xl font-semibold"
          variants={itemVariants}
        >
           Not Found
        </motion.h2>

        <motion.p 
          className="mb-6 text-lg opacity-90"
          variants={itemVariants}
        >
          Oops! The page you're looking for has been moved to a different section.
        </motion.p>
        
        <motion.div
          className="flex justify-center mb-8"
          variants={itemVariants}
        >
          <motion.div
            className="flex items-center gap-2 text-[#F6b100] opacity-80"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChefHat className="h-5 w-5" />
            <span className="text-sm">Our chef is preparing something special!</span>
          </motion.div>
        </motion.div>

        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap={{ scale: 0.95 }}
        >
          <Link
            to="/"
            style={{
              backgroundColor: "#F6b100",
              color: "white",
            }}
            className="inline-flex items-center gap-2 rounded-lg px-8 py-3 font-medium transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <motion.span
              animate={{ x: [0, -5, 0] }}
              transition={{ repeat: Infinity, repeatDelay: 1.5, duration: 0.5 }}
            >
              <LucideMoveLeft className="h-5 w-5" />
            </motion.span>
            Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </motion.main>
  );
};

export default NotFound;
