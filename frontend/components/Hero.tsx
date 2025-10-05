import CountdownTimer from './CountdownTimer';

const Hero = () => {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 py-24 min-h-screen bg-gradient-to-br from-blue-700 via-teal-600 to-indigo-800 text-white overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 opacity-30 rounded-full blur-3xl animate-pulse -z-10"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-400 opacity-30 rounded-full blur-3xl animate-pulse -z-10"></div>

      <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-300 to-teal-200">
        Something Awesome is Coming
      </h1>

      <p className="text-lg md:text-xl max-w-xl mb-8 text-gray-200">
        We're working hard to bring you something amazing. Stay tuned!
      </p>

      <CountdownTimer targetDate="2025-12-31T23:59:59" />

      <button className="mt-10 px-6 py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-full transition-all duration-300 shadow-lg">
        Notify Me
      </button>
    </section>
  );
};

export default Hero;
