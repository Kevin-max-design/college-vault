import { Classroom } from './ClassroomsClient'

export const SEED_CLASSROOMS: Record<string, Record<number, Classroom[]>> = {
  // CSE - Computer Science & Engineering
  CSE: {
    1: [
      { id: 'cse-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 5, member_count: 60, is_active_doubt: true, year: 1 },
      { id: 'cse-y1-2', name: 'Engineering Physics', subject_type: 'core', description: 'Wave optics and quantum mechanics introduction.', doubt_count: 2, member_count: 58, is_active_doubt: false, year: 1 },
      { id: 'cse-y1-3', name: 'Programming in C', subject_type: 'core', description: 'First principles of programming logic and C syntax.', doubt_count: 18, member_count: 62, is_active_doubt: true, year: 1 },
      { id: 'cse-y1-4', name: 'Basic Electronics', subject_type: 'elective', description: 'Diodes, transistors, and basic circuit design.', doubt_count: 0, member_count: 45, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'cse-y2-1', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Arrays, linked lists, trees, graphs, and sorting algorithms.', doubt_count: 12, member_count: 48, is_active_doubt: true, year: 2 },
      { id: 'cse-y2-2', name: 'Object-Oriented Programming', subject_type: 'core', description: 'Java classes, inheritance, polymorphism and design patterns.', doubt_count: 3, member_count: 50, is_active_doubt: false, year: 2 },
      { id: 'cse-y2-3', name: 'Computer Organization', subject_type: 'core', description: 'CPU architecture, memory hierarchy, instruction sets.', doubt_count: 0, member_count: 42, is_active_doubt: false, year: 2 },
      { id: 'cse-y2-4', name: 'Discrete Mathematics', subject_type: 'core', description: 'Logic, sets, relations, and graph theory.', doubt_count: 7, member_count: 44, is_active_doubt: true, year: 2 },
    ],
    3: [
      { id: 'cse-y3-1', name: 'Operating Systems', subject_type: 'core', description: 'Process management, memory management, and file systems.', doubt_count: 3, member_count: 42, is_active_doubt: false, year: 3 },
      { id: 'cse-y3-2', name: 'Database Management Systems', subject_type: 'core', description: 'ER models, SQL, transactions and normalization.', doubt_count: 9, member_count: 38, is_active_doubt: true, year: 3 },
      { id: 'cse-y3-3', name: 'Computer Networks', subject_type: 'core', description: 'OSI model, TCP/IP, routing algorithms.', doubt_count: 4, member_count: 35, is_active_doubt: false, year: 3 },
      { id: 'cse-y3-4', name: 'Machine Learning', subject_type: 'elective', description: 'Neural networks and backpropagation deep dive.', doubt_count: 7, member_count: 25, is_active_doubt: true, year: 3 },
      { id: 'cse-y3-5', name: 'Cloud Computing', subject_type: 'elective', description: 'AWS practicals starting this week.', doubt_count: 0, member_count: 30, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'cse-y4-1', name: 'Distributed Systems', subject_type: 'core', description: 'CAP theorem, consistency models, microservices.', doubt_count: 2, member_count: 28, is_active_doubt: false, year: 4 },
      { id: 'cse-y4-2', name: 'Compiler Design', subject_type: 'core', description: 'Lexical analysis, parsing, and code generation.', doubt_count: 6, member_count: 30, is_active_doubt: true, year: 4 },
      { id: 'cse-y4-3', name: 'Information Security', subject_type: 'elective', description: 'Cryptography, network security, ethical hacking overview.', doubt_count: 1, member_count: 22, is_active_doubt: false, year: 4 },
      { id: 'cse-y4-4', name: 'Major Project Seminar', subject_type: 'elective', description: 'Final year project discussions and progress reviews.', doubt_count: 0, member_count: 35, is_active_doubt: false, year: 4 },
    ],
  },
  // CSE-DS - CSE (Data Science)
  'CSE-DS': {
    1: [
      { id: 'ds-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 3, member_count: 60, is_active_doubt: false, year: 1 },
      { id: 'ds-y1-2', name: 'Engineering Chemistry', subject_type: 'core', description: 'Water technology, polymers, and electrochemistry.', doubt_count: 1, member_count: 55, is_active_doubt: false, year: 1 },
      { id: 'ds-y1-3', name: 'Programming in Python', subject_type: 'core', description: 'Basic programming concepts and data manipulation using Python.', doubt_count: 12, member_count: 61, is_active_doubt: true, year: 1 },
      { id: 'ds-y1-4', name: 'Basic Mechanical Eng', subject_type: 'elective', description: 'Thermodynamics and basic mechanical components.', doubt_count: 0, member_count: 40, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'ds-y2-1', name: 'Introduction to Data Science', subject_type: 'core', description: 'Data lifecycle, statistical foundations, exploratory data analysis.', doubt_count: 8, member_count: 58, is_active_doubt: true, year: 2 },
      { id: 'ds-y2-2', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Arrays, linked lists, trees, and optimization techniques.', doubt_count: 5, member_count: 57, is_active_doubt: false, year: 2 },
      { id: 'ds-y2-3', name: 'Probability & Inferential Stats', subject_type: 'core', description: 'Hypothesis testing, distributions, regression analysis.', doubt_count: 6, member_count: 56, is_active_doubt: true, year: 2 },
      { id: 'ds-y2-4', name: 'Database Management Systems', subject_type: 'core', description: 'SQL, relational algebra, and relational databases.', doubt_count: 2, member_count: 54, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'ds-y3-1', name: 'Data Warehousing & Mining', subject_type: 'core', description: 'Data integration, clustering, association rules.', doubt_count: 4, member_count: 50, is_active_doubt: false, year: 3 },
      { id: 'ds-y3-2', name: 'Machine Learning', subject_type: 'core', description: 'Supervised and unsupervised learning, evaluation metrics.', doubt_count: 11, member_count: 52, is_active_doubt: true, year: 3 },
      { id: 'ds-y3-3', name: 'Data Visualization Techniques', subject_type: 'core', description: 'PowerBI, Tableau, and custom Python visualization frameworks.', doubt_count: 3, member_count: 48, is_active_doubt: false, year: 3 },
      { id: 'ds-y3-4', name: 'NoSQL Databases', subject_type: 'elective', description: 'MongoDB, Cassandra, and document-store concepts.', doubt_count: 0, member_count: 38, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'ds-y4-1', name: 'Big Data Analytics', subject_type: 'core', description: 'Hadoop ecosystem, Spark, and map-reduce frameworks.', doubt_count: 7, member_count: 45, is_active_doubt: true, year: 4 },
      { id: 'ds-y4-2', name: 'Predictive Analytics', subject_type: 'core', description: 'Time series forecasting and advanced modeling.', doubt_count: 2, member_count: 43, is_active_doubt: false, year: 4 },
      { id: 'ds-y4-3', name: 'Business Intelligence', subject_type: 'elective', description: 'Enterprise analytics, KPI metrics, decision systems.', doubt_count: 1, member_count: 35, is_active_doubt: false, year: 4 },
      { id: 'ds-y4-4', name: 'Data Science Capstone Project', subject_type: 'elective', description: 'Real-world data product development and seminar.', doubt_count: 0, member_count: 45, is_active_doubt: false, year: 4 },
    ],
  },
  // CSE-AIML - CSE (AI & Machine Learning)
  'CSE-AIML': {
    1: [
      { id: 'aiml-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 3, member_count: 60, is_active_doubt: false, year: 1 },
      { id: 'aiml-y1-2', name: 'Applied Physics', subject_type: 'core', description: 'Semiconductors, lasers, and quantum mechanics.', doubt_count: 2, member_count: 58, is_active_doubt: false, year: 1 },
      { id: 'aiml-y1-3', name: 'Programming in C', subject_type: 'core', description: 'First principles of programming logic and C syntax.', doubt_count: 15, member_count: 62, is_active_doubt: true, year: 1 },
      { id: 'aiml-y1-4', name: 'Digital Logic Design', subject_type: 'elective', description: 'Binary systems, logic gates, combinational and sequential circuits.', doubt_count: 0, member_count: 42, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'aiml-y2-1', name: 'Discrete Mathematics', subject_type: 'core', description: 'Logic, sets, relations, functions, and algebraic structures.', doubt_count: 4, member_count: 50, is_active_doubt: false, year: 2 },
      { id: 'aiml-y2-2', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Arrays, linked lists, trees, graphs, and sorting.', doubt_count: 9, member_count: 52, is_active_doubt: true, year: 2 },
      { id: 'aiml-y2-3', name: 'Introduction to Artificial Intelligence', subject_type: 'core', description: 'Search strategies, knowledge representation, game playing.', doubt_count: 7, member_count: 55, is_active_doubt: true, year: 2 },
      { id: 'aiml-y2-4', name: 'Java Programming', subject_type: 'core', description: 'OOP concepts, multi-threading, and event-driven interfaces.', doubt_count: 1, member_count: 48, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'aiml-y3-1', name: 'Machine Learning', subject_type: 'core', description: 'Regression, classification, decision trees, support vector machines.', doubt_count: 10, member_count: 53, is_active_doubt: true, year: 3 },
      { id: 'aiml-y3-2', name: 'Neural Networks & Deep Learning', subject_type: 'core', description: 'MLP, backpropagation, CNNs, RNNs, and hyperparameter tuning.', doubt_count: 14, member_count: 51, is_active_doubt: true, year: 3 },
      { id: 'aiml-y3-3', name: 'Digital Image Processing', subject_type: 'elective', description: 'Image enhancement, filtering, segmentation, and restoration.', doubt_count: 2, member_count: 40, is_active_doubt: false, year: 3 },
      { id: 'aiml-y3-4', name: 'Natural Language Processing', subject_type: 'elective', description: 'Tokenization, syntax trees, POS tagging, and transformer models.', doubt_count: 4, member_count: 38, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'aiml-y4-1', name: 'Computer Vision', subject_type: 'core', description: 'Object detection, image classification, segmentation, and OpenCV.', doubt_count: 6, member_count: 46, is_active_doubt: true, year: 4 },
      { id: 'aiml-y4-2', name: 'Reinforcement Learning', subject_type: 'core', description: 'Markov decision processes, Q-learning, and deep Q-networks.', doubt_count: 3, member_count: 42, is_active_doubt: false, year: 4 },
      { id: 'aiml-y4-3', name: 'AI Ethics & Safety', subject_type: 'elective', description: 'Bias, transparency, fairness, and accountability in AI models.', doubt_count: 0, member_count: 35, is_active_doubt: false, year: 4 },
      { id: 'aiml-y4-4', name: 'AIML Capstone Project', subject_type: 'elective', description: 'Design and deploy AI systems to solve real-world problems.', doubt_count: 0, member_count: 46, is_active_doubt: false, year: 4 },
    ],
  },
  // CSE-CS - CSE (Cyber Security)
  'CSE-CS': {
    1: [
      { id: 'cs-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 2, member_count: 58, is_active_doubt: false, year: 1 },
      { id: 'cs-y1-2', name: 'Engineering Physics', subject_type: 'core', description: 'Wave optics and quantum mechanics introduction.', doubt_count: 1, member_count: 56, is_active_doubt: false, year: 1 },
      { id: 'cs-y1-3', name: 'Programming in C', subject_type: 'core', description: 'First principles of programming logic and C syntax.', doubt_count: 11, member_count: 60, is_active_doubt: true, year: 1 },
      { id: 'cs-y1-4', name: 'IT Workshop', subject_type: 'elective', description: 'Shell scripting, operating systems installations, and basics.', doubt_count: 0, member_count: 42, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'cs-y2-1', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Arrays, lists, trees, graphs, and algorithm analysis.', doubt_count: 6, member_count: 47, is_active_doubt: false, year: 2 },
      { id: 'cs-y2-2', name: 'Computer Organization & Architecture', subject_type: 'core', description: 'Processor components, memory subsystems, and assembly.', doubt_count: 2, member_count: 45, is_active_doubt: false, year: 2 },
      { id: 'cs-y2-3', name: 'Introduction to Cyber Security', subject_type: 'core', description: 'Threat landscape, security protocols, encryption models.', doubt_count: 10, member_count: 52, is_active_doubt: true, year: 2 },
      { id: 'cs-y2-4', name: 'Discrete Mathematics', subject_type: 'core', description: 'Modular arithmetic, cryptography logic, and graph theory.', doubt_count: 5, member_count: 44, is_active_doubt: true, year: 2 },
    ],
    3: [
      { id: 'cs-y3-1', name: 'Cryptography & Network Security', subject_type: 'core', description: 'RSA, AES, hashing, digital signatures, IPSec, and firewalls.', doubt_count: 12, member_count: 49, is_active_doubt: true, year: 3 },
      { id: 'cs-y3-2', name: 'Operating Systems Security', subject_type: 'core', description: 'Access controls, privilege levels, rootkits, and hardening.', doubt_count: 5, member_count: 46, is_active_doubt: false, year: 3 },
      { id: 'cs-y3-3', name: 'Ethical Hacking', subject_type: 'elective', description: 'Reconnaissance, scanning, system hacking, and web app attacks.', doubt_count: 8, member_count: 36, is_active_doubt: true, year: 3 },
      { id: 'cs-y3-4', name: 'Database Security', subject_type: 'elective', description: 'Injection attacks, privilege management, and data auditing.', doubt_count: 1, member_count: 30, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'cs-y4-1', name: 'Cyber Forensics & Incident Response', subject_type: 'core', description: 'Digital evidence collection, disk imaging, and log analysis.', doubt_count: 8, member_count: 42, is_active_doubt: true, year: 4 },
      { id: 'cs-y4-2', name: 'Cloud Security', subject_type: 'core', description: 'Identity management, virtualization risks, and IAM rules.', doubt_count: 3, member_count: 40, is_active_doubt: false, year: 4 },
      { id: 'cs-y4-3', name: 'Penetration Testing Lab', subject_type: 'elective', description: 'Metasploit, Nmap, and hands-on vulnerability assessments.', doubt_count: 0, member_count: 25, is_active_doubt: false, year: 4 },
      { id: 'cs-y4-4', name: 'Cyber Security Project', subject_type: 'elective', description: 'Design secure systems or develop defense tools.', doubt_count: 0, member_count: 42, is_active_doubt: false, year: 4 },
    ],
  },
  // CSBS - CSE & Business Systems (CSBS)
  CSBS: {
    1: [
      { id: 'bs-y1-1', name: 'Discrete Mathematics', subject_type: 'core', description: 'Logic, proof techniques, sets, and graph theory foundations.', doubt_count: 3, member_count: 55, is_active_doubt: false, year: 1 },
      { id: 'bs-y1-2', name: 'Principles of Management', subject_type: 'core', description: 'Management theory, planning, leadership, and organization.', doubt_count: 1, member_count: 54, is_active_doubt: false, year: 1 },
      { id: 'bs-y1-3', name: 'Programming in C', subject_type: 'core', description: 'C logic foundations, modular functions, structures.', doubt_count: 9, member_count: 58, is_active_doubt: true, year: 1 },
      { id: 'bs-y1-4', name: 'Financial Accounting', subject_type: 'core', description: 'Double-entry bookkeeping, trial balance, and statements.', doubt_count: 4, member_count: 56, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'bs-y2-1', name: 'Data Structures & Algorithms', subject_type: 'core', description: 'Sorting, structures, complexity analysis and operations.', doubt_count: 5, member_count: 48, is_active_doubt: false, year: 2 },
      { id: 'bs-y2-2', name: 'Computer Organization & Architecture', subject_type: 'core', description: 'Registers, ALU, instructions, and bus protocols.', doubt_count: 0, member_count: 46, is_active_doubt: false, year: 2 },
      { id: 'bs-y2-3', name: 'Business Analytics', subject_type: 'core', description: 'Regression, modeling, spreadsheets and operational systems.', doubt_count: 8, member_count: 50, is_active_doubt: true, year: 2 },
      { id: 'bs-y2-4', name: 'Statistical Methods', subject_type: 'core', description: 'ANOVA, regressions, and statistical tests.', doubt_count: 2, member_count: 45, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'bs-y3-1', name: 'Software Engineering & Agile', subject_type: 'core', description: 'Scrum, software lifecycles, and code design principles.', doubt_count: 3, member_count: 44, is_active_doubt: false, year: 3 },
      { id: 'bs-y3-2', name: 'Database Management Systems', subject_type: 'core', description: 'Relational algebra, normal forms, and SQL procedures.', doubt_count: 6, member_count: 43, is_active_doubt: true, year: 3 },
      { id: 'bs-y3-3', name: 'Marketing Management', subject_type: 'elective', description: '4Ps, branding, segmentation, and market research.', doubt_count: 0, member_count: 32, is_active_doubt: false, year: 3 },
      { id: 'bs-y3-4', name: 'Financial Management', subject_type: 'elective', description: 'Working capital, capital budgeting, and market instruments.', doubt_count: 3, member_count: 30, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'bs-y4-1', name: 'Enterprise Systems', subject_type: 'core', description: 'ERP architectures, business workflows, and integrations.', doubt_count: 4, member_count: 38, is_active_doubt: true, year: 4 },
      { id: 'bs-y4-2', name: 'Corporate Finance & Strategy', subject_type: 'core', description: 'Portfolio theories, capital structures, and mergers.', doubt_count: 1, member_count: 36, is_active_doubt: false, year: 4 },
      { id: 'bs-y4-3', name: 'Human Resource Management', subject_type: 'elective', description: 'Recruiting, payrolls, industrial relations, labor laws.', doubt_count: 0, member_count: 28, is_active_doubt: false, year: 4 },
      { id: 'bs-y4-4', name: 'CSBS Capstone Project', subject_type: 'elective', description: 'Develop a technological solution for a business problem.', doubt_count: 0, member_count: 38, is_active_doubt: false, year: 4 },
    ],
  },
  // ECE - Electronics & Communication Engineering
  ECE: {
    1: [
      { id: 'ece-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 3, member_count: 55, is_active_doubt: false, year: 1 },
      { id: 'ece-y1-2', name: 'Engineering Physics', subject_type: 'core', description: 'Wave optics and quantum mechanics introduction.', doubt_count: 2, member_count: 53, is_active_doubt: false, year: 1 },
      { id: 'ece-y1-3', name: 'Programming in C', subject_type: 'core', description: 'First principles of programming logic and C syntax.', doubt_count: 12, member_count: 56, is_active_doubt: true, year: 1 },
      { id: 'ece-y1-4', name: 'Basic Electrical Engineering', subject_type: 'elective', description: 'Circuit elements, Kirchhoff\'s laws, AC circuits overview.', doubt_count: 0, member_count: 40, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'ece-y2-1', name: 'Electronic Devices and Circuits', subject_type: 'core', description: 'Diodes, BJTs, MOSFETs and amplifier topologies.', doubt_count: 9, member_count: 48, is_active_doubt: true, year: 2 },
      { id: 'ece-y2-2', name: 'Switching Theory and Logic Design', subject_type: 'core', description: 'K-maps, logic families, combinational and sequential circuit design.', doubt_count: 2, member_count: 45, is_active_doubt: false, year: 2 },
      { id: 'ece-y2-3', name: 'Signals and Systems', subject_type: 'core', description: 'Fourier, Laplace, and Z-transforms; LTI systems analysis.', doubt_count: 14, member_count: 50, is_active_doubt: true, year: 2 },
      { id: 'ece-y2-4', name: 'Network Analysis', subject_type: 'core', description: 'Mesh, nodal equations, network theorems, and transient responses.', doubt_count: 4, member_count: 46, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'ece-y3-1', name: 'Analog Communications', subject_type: 'core', description: 'Amplitude, frequency, and phase modulation techniques.', doubt_count: 6, member_count: 42, is_active_doubt: false, year: 3 },
      { id: 'ece-y3-2', name: 'Microprocessors and Microcontrollers', subject_type: 'core', description: '8086 architecture, assembly, peripheral interfacing, and 8051.', doubt_count: 11, member_count: 44, is_active_doubt: true, year: 3 },
      { id: 'ece-y3-3', name: 'Digital Signal Processing', subject_type: 'core', description: 'DFT, FFT algorithms, and FIR/IIR filter design methodologies.', doubt_count: 8, member_count: 41, is_active_doubt: true, year: 3 },
      { id: 'ece-y3-4', name: 'Antennas and Wave Propagation', subject_type: 'elective', description: 'Radiation patterns, loop antennas, and sky/ground waves.', doubt_count: 0, member_count: 28, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'ece-y4-1', name: 'VLSI Design', subject_type: 'core', description: 'CMOS fabrication, inverter delay, stick diagrams, and layout.', doubt_count: 7, member_count: 38, is_active_doubt: true, year: 4 },
      { id: 'ece-y4-2', name: 'Embedded Systems', subject_type: 'core', description: 'RTOS, scheduling algorithms, and hardware-software co-design.', doubt_count: 2, member_count: 36, is_active_doubt: false, year: 4 },
      { id: 'ece-y4-3', name: 'Optical Communications', subject_type: 'elective', description: 'Fibers, dispersion, optical sources, photodetectors, and link designs.', doubt_count: 1, member_count: 22, is_active_doubt: false, year: 4 },
      { id: 'ece-y4-4', name: 'Cellular & Mobile Communications', subject_type: 'elective', description: 'Frequency reuse, handoff, fading channels, and LTE/5G.', doubt_count: 0, member_count: 34, is_active_doubt: false, year: 4 },
    ],
  },
  // EEE - Electrical & Electronics Engineering
  EEE: {
    1: [
      { id: 'eee-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 4, member_count: 52, is_active_doubt: false, year: 1 },
      { id: 'eee-y1-2', name: 'Engineering Chemistry', subject_type: 'core', description: 'Batteries, electrochemistry, and material analysis.', doubt_count: 1, member_count: 50, is_active_doubt: false, year: 1 },
      { id: 'eee-y1-3', name: 'Programming in C', subject_type: 'core', description: 'First principles of programming logic and C syntax.', doubt_count: 8, member_count: 54, is_active_doubt: true, year: 1 },
      { id: 'eee-y1-4', name: 'Basic Engineering Mechanics', subject_type: 'elective', description: 'Force systems, equilibrium, trusses, and centroids.', doubt_count: 0, member_count: 35, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'eee-y2-1', name: 'DC Machines and Transformers', subject_type: 'core', description: 'DC generator, motor characteristics, and single-phase transformers.', doubt_count: 8, member_count: 44, is_active_doubt: true, year: 2 },
      { id: 'eee-y2-2', name: 'Electrical Circuit Analysis', subject_type: 'core', description: 'Three-phase systems, magnetic circuits, and resonance.', doubt_count: 3, member_count: 42, is_active_doubt: false, year: 2 },
      { id: 'eee-y2-3', name: 'Electromagnetic Fields', subject_type: 'core', description: 'Coulomb\'s law, Gauss\'s law, Ampere\'s law, and Maxwell\'s equations.', doubt_count: 11, member_count: 43, is_active_doubt: true, year: 2 },
      { id: 'eee-y2-4', name: 'Analog Electronics', subject_type: 'core', description: 'Transistors, operational amplifiers and multi-vibrators.', doubt_count: 2, member_count: 40, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'eee-y3-1', name: 'AC Machines', subject_type: 'core', description: 'Induction motors, synchronous generators and alternate motors.', doubt_count: 5, member_count: 38, is_active_doubt: false, year: 3 },
      { id: 'eee-y3-2', name: 'Power Systems-I', subject_type: 'core', description: 'Generation systems, transmission line parameters, insulators.', doubt_count: 7, member_count: 40, is_active_doubt: true, year: 3 },
      { id: 'eee-y3-3', name: 'Control Systems', subject_type: 'core', description: 'Block diagrams, transfer functions, and root-locus/bode plots.', doubt_count: 12, member_count: 39, is_active_doubt: true, year: 3 },
      { id: 'eee-y3-4', name: 'Power Electronics', subject_type: 'elective', description: 'Thyristors, converters, inverters, and cycloconverters.', doubt_count: 0, member_count: 25, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'eee-y4-1', name: 'Power System Operation and Control', subject_type: 'core', description: 'Economic dispatch, frequency control, voltage regulators.', doubt_count: 6, member_count: 34, is_active_doubt: true, year: 4 },
      { id: 'eee-y4-2', name: 'Electrical Drives', subject_type: 'core', description: 'Thyristor drives, chopper-fed drives, induction motor speed control.', doubt_count: 2, member_count: 35, is_active_doubt: false, year: 4 },
      { id: 'eee-y4-3', name: 'Utilization of Electrical Energy', subject_type: 'elective', description: 'Heating, welding, illumination, and electrical traction systems.', doubt_count: 1, member_count: 20, is_active_doubt: false, year: 4 },
      { id: 'eee-y4-4', name: 'Smart Grid Technologies', subject_type: 'elective', description: 'PMU integration, microgrids, renewable energy storage.', doubt_count: 0, member_count: 30, is_active_doubt: false, year: 4 },
    ],
  },
  // ME - Mechanical Engineering
  ME: {
    1: [
      { id: 'me-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 2, member_count: 48, is_active_doubt: false, year: 1 },
      { id: 'me-y1-2', name: 'Engineering Chemistry', subject_type: 'core', description: 'Lubricants, refractories, and environmental protection.', doubt_count: 1, member_count: 45, is_active_doubt: false, year: 1 },
      { id: 'me-y1-3', name: 'Engineering Drawing', subject_type: 'core', description: 'Projection lines, planes, solids, and isometric views.', doubt_count: 14, member_count: 50, is_active_doubt: true, year: 1 },
      { id: 'me-y1-4', name: 'Basic Workshop Practice', subject_type: 'elective', description: 'Fitting, carpentry, tin-smithy, and simple casting work.', doubt_count: 0, member_count: 32, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'me-y2-1', name: 'Engineering Mechanics', subject_type: 'core', description: 'Static and dynamic systems, laws of motion, frictions.', doubt_count: 8, member_count: 40, is_active_doubt: true, year: 2 },
      { id: 'me-y2-2', name: 'Thermodynamics', subject_type: 'core', description: 'First and second laws, properties of pure substances, gas cycles.', doubt_count: 4, member_count: 42, is_active_doubt: false, year: 2 },
      { id: 'me-y2-3', name: 'Mechanics of Solids', subject_type: 'core', description: 'Stress-strain diagrams, shear force, bending moments.', doubt_count: 10, member_count: 41, is_active_doubt: true, year: 2 },
      { id: 'me-y2-4', name: 'Metallurgy & Material Science', subject_type: 'core', description: 'Crystal systems, phase diagrams, heat treatments.', doubt_count: 1, member_count: 38, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'me-y3-1', name: 'Kinematics of Machinery', subject_type: 'core', description: 'Mechanisms, velocity and acceleration diagrams, cams, gears.', doubt_count: 6, member_count: 36, is_active_doubt: false, year: 3 },
      { id: 'me-y3-2', name: 'Heat Transfer', subject_type: 'core', description: 'Conduction, convection, radiation, and heat exchangers.', doubt_count: 9, member_count: 35, is_active_doubt: true, year: 3 },
      { id: 'me-y3-3', name: 'Machine Tools', subject_type: 'core', description: 'Lathe, shaping, milling, grinding, and CNC operations.', doubt_count: 4, member_count: 37, is_active_doubt: false, year: 3 },
      { id: 'me-y3-4', name: 'Design of Machine Members', subject_type: 'core', description: 'Shafts, joints, springs, and bearings specifications.', doubt_count: 8, member_count: 34, is_active_doubt: true, year: 3 },
    ],
    4: [
      { id: 'me-y4-1', name: 'CAD/CAM', subject_type: 'core', description: 'Geometric modeling, NC programming, and computer networks.', doubt_count: 5, member_count: 32, is_active_doubt: true, year: 4 },
      { id: 'me-y4-2', name: 'Automobile Engineering', subject_type: 'core', description: 'Engine components, transmissions, steerings, and brakes.', doubt_count: 1, member_count: 30, is_active_doubt: false, year: 4 },
      { id: 'me-y4-3', name: 'Refrigeration and Air Conditioning', subject_type: 'elective', description: 'Vapor compression systems, psychrometric calculations.', doubt_count: 3, member_count: 20, is_active_doubt: false, year: 4 },
      { id: 'me-y4-4', name: 'Operations Research', subject_type: 'elective', description: 'Linear programming, queuing theories, and inventory controls.', doubt_count: 0, member_count: 28, is_active_doubt: false, year: 4 },
    ],
  },
  // CE - Civil Engineering
  CE: {
    1: [
      { id: 'ce-y1-1', name: 'Engineering Mathematics I', subject_type: 'core', description: 'Calculus, matrices, and differential equations foundations.', doubt_count: 1, member_count: 45, is_active_doubt: false, year: 1 },
      { id: 'ce-y1-2', name: 'Engineering Physics', subject_type: 'core', description: 'Properties of matter, waves, and quantum introduction.', doubt_count: 1, member_count: 43, is_active_doubt: false, year: 1 },
      { id: 'ce-y1-3', name: 'Engineering Mechanics', subject_type: 'core', description: 'Statics and dynamics of structures, centroids and friction.', doubt_count: 12, member_count: 46, is_active_doubt: true, year: 1 },
      { id: 'ce-y1-4', name: 'Basic Surveying', subject_type: 'core', description: 'Chain, compass, plane table surveying, leveling concepts.', doubt_count: 3, member_count: 44, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'ce-y2-1', name: 'Strength of Materials', subject_type: 'core', description: 'Shear and bending stresses, deflection in beams, columns.', doubt_count: 9, member_count: 38, is_active_doubt: true, year: 2 },
      { id: 'ce-y2-2', name: 'Fluid Mechanics', subject_type: 'core', description: 'Pressure measurement, pipe flows, and open channel flows.', doubt_count: 5, member_count: 37, is_active_doubt: false, year: 2 },
      { id: 'ce-y2-3', name: 'Building Materials & Construction', subject_type: 'core', description: 'Stones, bricks, cements, concretes, and masonry.', doubt_count: 1, member_count: 39, is_active_doubt: false, year: 2 },
      { id: 'ce-y2-4', name: 'Concrete Technology', subject_type: 'core', description: 'Admixtures, mix design, workability, and concrete tests.', doubt_count: 4, member_count: 36, is_active_doubt: false, year: 2 },
    ],
    3: [
      { id: 'ce-y3-1', name: 'Structural Analysis', subject_type: 'core', description: 'Energy theorems, slope deflection, and moment distribution.', doubt_count: 8, member_count: 35, is_active_doubt: true, year: 3 },
      { id: 'ce-y3-2', name: 'Geotechnical Engineering', subject_type: 'core', description: 'Soil classification, compaction, consolidation, and shear.', doubt_count: 6, member_count: 34, is_active_doubt: false, year: 3 },
      { id: 'ce-y3-3', name: 'Transportation Engineering', subject_type: 'core', description: 'Highway alignments, geometric designs, traffic systems.', doubt_count: 3, member_count: 35, is_active_doubt: false, year: 3 },
      { id: 'ce-y3-4', name: 'Environmental Engineering', subject_type: 'elective', description: 'Water treatment, sewage disposal, and solid waste systems.', doubt_count: 1, member_count: 24, is_active_doubt: false, year: 3 },
    ],
    4: [
      { id: 'ce-y4-1', name: 'Design of Steel Structures', subject_type: 'core', description: 'Tension, compression members, bolted and welded joints.', doubt_count: 7, member_count: 32, is_active_doubt: true, year: 4 },
      { id: 'ce-y4-2', name: 'Water Resources Engineering', subject_type: 'core', description: 'Hydrology, irrigation demands, canal networks, and dams.', doubt_count: 2, member_count: 30, is_active_doubt: false, year: 4 },
      { id: 'ce-y4-3', name: 'Estimation and Costing', subject_type: 'elective', description: 'Rate analyses, valuation, and tender preparation procedures.', doubt_count: 1, member_count: 26, is_active_doubt: false, year: 4 },
      { id: 'ce-y4-4', name: 'Prestressed Concrete', subject_type: 'elective', description: 'Pretensioning, post-tensioning methods, losses computation.', doubt_count: 0, member_count: 28, is_active_doubt: false, year: 4 },
    ],
  },
  // MCA - Master of Computer Applications
  MCA: {
    1: [
      { id: 'mca-y1-1', name: 'Mathematical Foundations of CS', subject_type: 'core', description: 'Graph theory, set principles, and mathematical logics.', doubt_count: 5, member_count: 48, is_active_doubt: true, year: 1 },
      { id: 'mca-y1-2', name: 'Data Structures using C++', subject_type: 'core', description: 'Memory structures, complexity algorithms, tree models.', doubt_count: 7, member_count: 46, is_active_doubt: false, year: 1 },
      { id: 'mca-y1-3', name: 'Computer Organization', subject_type: 'core', description: 'Central processing architectures, memory interfaces.', doubt_count: 1, member_count: 42, is_active_doubt: false, year: 1 },
      { id: 'mca-y1-4', name: 'Operating Systems', subject_type: 'core', description: 'Kernels, threads, process structures, and filesystem basics.', doubt_count: 3, member_count: 45, is_active_doubt: false, year: 1 },
    ],
    2: [
      { id: 'mca-y2-1', name: 'Java Programming', subject_type: 'core', description: 'Inheritance, exception rules, database interfaces via JDBC.', doubt_count: 9, member_count: 43, is_active_doubt: true, year: 2 },
      { id: 'mca-y2-2', name: 'Software Engineering', subject_type: 'core', description: 'SDLC methodologies, design architectures, testing models.', doubt_count: 2, member_count: 41, is_active_doubt: false, year: 2 },
      { id: 'mca-y2-3', name: 'Web Technologies', subject_type: 'core', description: 'HTML, JavaScript, Node servers, API request systems.', doubt_count: 4, member_count: 42, is_active_doubt: false, year: 2 },
      { id: 'mca-y2-4', name: 'Mobile Application Development', subject_type: 'elective', description: 'Android application designs, layouts, and system logic.', doubt_count: 1, member_count: 30, is_active_doubt: false, year: 2 },
    ],
  },
  // MBA - Management Studies
  MBA: {
    1: [
      { id: 'mba-y1-1', name: 'Management & Organizational Behavior', subject_type: 'core', description: 'Leadership principles, motivation models, and team dynamics.', doubt_count: 3, member_count: 55, is_active_doubt: false, year: 1 },
      { id: 'mba-y1-2', name: 'Managerial Economics', subject_type: 'core', description: 'Supply-demand analysis, elasticity, cost functions.', doubt_count: 4, member_count: 54, is_active_doubt: false, year: 1 },
      { id: 'mba-y1-3', name: 'Financial Accounting', subject_type: 'core', description: 'Balance sheets, cash flows, and double-entry methods.', doubt_count: 10, member_count: 56, is_active_doubt: true, year: 1 },
      { id: 'mba-y1-4', name: 'Business Statistics', subject_type: 'core', description: 'Hypothesis tests, regression, ANOVA analysis for business.', doubt_count: 6, member_count: 52, is_active_doubt: true, year: 1 },
    ],
    2: [
      { id: 'mba-y2-1', name: 'Strategic Management', subject_type: 'core', description: 'SWOT analyses, BCG matrices, corporate growth strategies.', doubt_count: 2, member_count: 48, is_active_doubt: false, year: 2 },
      { id: 'mba-y2-2', name: 'Financial Management', subject_type: 'core', description: 'Capital budgeting, cost of capital, dividend payout options.', doubt_count: 8, member_count: 46, is_active_doubt: true, year: 2 },
      { id: 'mba-y2-3', name: 'Marketing Management', subject_type: 'elective', description: 'Digital branding, customer journeys, and media plans.', doubt_count: 1, member_count: 35, is_active_doubt: false, year: 2 },
      { id: 'mba-y2-4', name: 'Human Resource Management', subject_type: 'elective', description: 'Performance appraisal, talent acquisition, labor welfare.', doubt_count: 0, member_count: 38, is_active_doubt: false, year: 2 },
    ],
  },
  // MATHS - Mathematics (S&H)
  MATHS: {
    1: [
      { id: 'mth-y1-1', name: 'Linear Algebra & Calculus', subject_type: 'core', description: 'Eigenvalues, diagonalizations, multiple integrations, polar curves.', doubt_count: 3, member_count: 60, is_active_doubt: false, year: 1 },
      { id: 'mth-y1-2', name: 'Differential Equations', subject_type: 'core', description: 'First-order equations, higher-order linear equations.', doubt_count: 8, member_count: 58, is_active_doubt: true, year: 1 },
      { id: 'mth-y1-3', name: 'Numerical Methods', subject_type: 'core', description: 'Newton-Raphson, trapezoidal rule, Simpson\'s integration.', doubt_count: 2, member_count: 55, is_active_doubt: false, year: 1 },
      { id: 'mth-y1-4', name: 'Probability & Statistics', subject_type: 'elective', description: 'Normal distributions, t-tests, chi-square tests, correlation.', doubt_count: 0, member_count: 40, is_active_doubt: false, year: 1 },
    ],
  },
  // PHY - Physics (S&H)
  PHY: {
    1: [
      { id: 'phy-y1-1', name: 'Applied Physics', subject_type: 'core', description: 'Electromagnetic waves, interference and diffraction basics.', doubt_count: 2, member_count: 58, is_active_doubt: false, year: 1 },
      { id: 'phy-y1-2', name: 'Quantum Mechanics foundations', subject_type: 'core', description: 'Wave-particle duality, Schrodinger wave equations.', doubt_count: 6, member_count: 56, is_active_doubt: true, year: 1 },
      { id: 'phy-y1-3', name: 'Semiconductor Physics', subject_type: 'core', description: 'Band theories, Fermi levels, Hall effects, p-n junctions.', doubt_count: 4, member_count: 54, is_active_doubt: false, year: 1 },
      { id: 'phy-y1-4', name: 'Lasers and Fiber Optics', subject_type: 'elective', description: 'Ruby lasers, Nd:YAG, fiber cables, attenuation mechanics.', doubt_count: 0, member_count: 38, is_active_doubt: false, year: 1 },
    ],
  },
  // CHEM - Chemistry (S&H)
  CHEM: {
    1: [
      { id: 'chm-y1-1', name: 'Engineering Chemistry', subject_type: 'core', description: 'Hardness of water, boiler troubles, municipal treatments.', doubt_count: 1, member_count: 60, is_active_doubt: false, year: 1 },
      { id: 'chm-y1-2', name: 'Organic Chemistry', subject_type: 'core', description: 'Isomerism, nucleophilic substitutions, aromatic systems.', doubt_count: 5, member_count: 58, is_active_doubt: true, year: 1 },
      { id: 'chm-y1-3', name: 'Environmental Science', subject_type: 'core', description: 'Ecosystems, biodiversity, air-water pollutions, protocols.', doubt_count: 0, member_count: 62, is_active_doubt: false, year: 1 },
      { id: 'chm-y1-4', name: 'Polymer Chemistry', subject_type: 'elective', description: 'Thermoplastics, thermosets, elastomers, synthetic rubber.', doubt_count: 0, member_count: 40, is_active_doubt: false, year: 1 },
    ],
  },
  // ENG - English (S&H)
  ENG: {
    1: [
      { id: 'eng-y1-1', name: 'Communicative English', subject_type: 'core', description: 'Grammar review, listening skills, public speaking techniques.', doubt_count: 0, member_count: 60, is_active_doubt: false, year: 1 },
      { id: 'eng-y1-2', name: 'Professional Writing', subject_type: 'core', description: 'Resume builds, email writing formats, official applications.', doubt_count: 2, member_count: 58, is_active_doubt: false, year: 1 },
      { id: 'eng-y1-3', name: 'Soft Skills and Interview Prep', subject_type: 'core', description: 'Body language, group discussion frameworks, posture guidance.', doubt_count: 1, member_count: 62, is_active_doubt: false, year: 1 },
      { id: 'eng-y1-4', name: 'Technical Communication', subject_type: 'elective', description: 'Report writing structures, abstract designs, visual layouts.', doubt_count: 0, member_count: 42, is_active_doubt: false, year: 1 },
    ],
  },
}

export const DEPT_LABELS: Record<string, string> = {
  CSE: 'Computer Science & Engineering (CSE)',
  'CSE-DS': 'CSE (Data Science)',
  'CSE-AIML': 'CSE (AI & Machine Learning)',
  'CSE-CS': 'CSE (Cyber Security)',
  CSBS: 'CSE & Business Systems (CSBS)',
  ECE: 'Electronics & Communication Engineering (ECE)',
  EEE: 'Electrical & Electronics Engineering (EEE)',
  ME: 'Mechanical Engineering (ME)',
  CE: 'Civil Engineering (CE)',
  MCA: 'Master of Computer Applications (MCA)',
  MBA: 'Management Studies (MBA)',
  MATHS: 'Mathematics (S&H)',
  PHY: 'Physics (S&H)',
  CHEM: 'Chemistry (S&H)',
  ENG: 'English (S&H)',
}
