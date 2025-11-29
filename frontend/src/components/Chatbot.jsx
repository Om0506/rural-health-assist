import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';
import { flagAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext.jsx';

function Chatbot({ userId }) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([
    {
      text: t('Chatbot greeting'),
      sender: 'bot',
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update greeting message when language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length > 0 && prev[0].sender === 'bot') {
        return [
          {
            text: t('Chatbot greeting'),
            sender: 'bot',
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(1)
        ];
      }
      return prev;
    });
  }, [language, t]);

  const getBotResponse = (message) => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('fever')) {
      if (lowerMsg.includes('high') || lowerMsg.includes('severe')) {
        return {
          text: "High fever can be serious. I'm flagging this for ASHA worker review. Meanwhile: Rest, drink fluids, take paracetamol if needed. Seek immediate help if fever is above 103°F.",
          severity: 'moderate'
        };
      }
      return {
        text: "For mild fever: Rest well, drink plenty of fluids, you can take paracetamol if needed. Monitor your temperature. If it persists for more than 3 days or goes above 102°F, please consult an ASHA worker.",
        severity: 'normal'
      };
    }
    
    if (lowerMsg.includes('cough')) {
      if (lowerMsg.includes('severe') || lowerMsg.includes('blood')) {
        return {
          text: "Severe cough or coughing blood requires immediate medical attention. I'm flagging this for ASHA worker review. Please seek medical help as soon as possible.",
          severity: 'moderate'
        };
      }
      return {
        text: "For cough: Stay hydrated, avoid cold drinks, try warm water with honey. Rest your voice. If cough persists for more than a week or worsens, please consult a healthcare worker.",
        severity: 'normal'
      };
    }
    
    if (lowerMsg.includes('headache')) {
      if (lowerMsg.includes('severe') || lowerMsg.includes('unbearable')) {
        return {
          text: "Severe headaches can indicate serious conditions. I'm flagging this for ASHA worker review. Rest in a dark, quiet room. If accompanied by vision changes or vomiting, seek immediate help.",
          severity: 'moderate'
        };
      }
      return {
        text: "For headache: Rest in a quiet place, stay hydrated, you can take paracetamol if needed. Avoid bright lights and screens. If headache is severe or persists, consult a healthcare worker.",
        severity: 'normal'
      };
    }
    
    if (lowerMsg.includes('dehydration') || lowerMsg.includes('thirsty')) {
      return {
        text: "For dehydration: Drink plenty of water, ORS solution is helpful. Avoid sugary drinks. Eat water-rich foods. Signs of severe dehydration (dizziness, dark urine, rapid heartbeat) need medical attention.",
        severity: 'normal'
      };
    }
    
    if (lowerMsg.includes('thank')) {
      return {
        text: t('Chatbot thank you'),
        severity: 'normal'
      };
    }
    
    return {
      text: t('Chatbot default response'),
      severity: 'normal'
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      text: input,
      sender: 'user',
      time: new Date().toLocaleTimeString()
    };
    const userInput = input;

    setMessages([...messages, userMessage]);
    setInput('');

    setTimeout(async () => {
      const botReply = getBotResponse(userInput);
      const botMessage = {
        text: botReply.text,
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);

      if (botReply.severity === 'moderate') {
        try {
          await flagAPI.flagCase(userId, {
            reason: `Chatbot escalation: ${userInput}`,
            severity: 'moderate'
          });
          
          setTimeout(() => {
            setMessages(prev => [...prev, {
              text: t('Case flagged message'),
              sender: 'system',
              time: new Date().toLocaleTimeString()
            }]);
          }, 500);
        } catch (error) {
          console.error('Error flagging case:', error);
          setTimeout(() => {
            setMessages(prev => [...prev, {
              text: t('Unable to flag message'),
              sender: 'system',
              time: new Date().toLocaleTimeString()
            }]);
          }, 500);
        }
      }
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-primary text-white p-4 flex items-center space-x-2">
        <FaRobot className="text-2xl" />
        <div>
          <h3 className="font-bold">{t('Health Assistant')}</h3>
          <p className="text-xs text-green-100">{t('Online - Ask me anything')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{ maxHeight: '400px' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start space-x-2 max-w-xs md:max-w-md ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user'
                    ? 'bg-secondary text-white'
                    : message.sender === 'system'
                    ? 'bg-accent text-white'
                    : 'bg-primary text-white'
                }`}
              >
                {message.sender === 'user' ? (
                  <FaUser className="text-xs" />
                ) : (
                  <FaRobot className="text-xs" />
                )}
              </div>
              
              <div>
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-secondary text-white'
                      : message.sender === 'system'
                      ? 'bg-accent text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-1">{message.time}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('Type your symptoms...')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            className="bg-primary text-white p-3 rounded-full hover:bg-green-600 transition"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;
