import {
  FaCoffee,
  FaMoon,
  FaTree,
  FaHome,
  FaWineGlass,
  FaUmbrellaBeach,
  FaSnowflake,
  FaGift,
  FaBolt,
  FaSearch,
  FaHeart,
  FaTimes,
  FaForward,
  FaBomb,
  FaSun,
  FaCalendarDay,
  FaMountain,
  FaLemon,
  FaApple,
  FaPepperHot,
  FaLeaf,
  FaGem,
  FaWater,
  FaSprayCan,
  FaWind,
  FaBriefcase,
  FaMinus,
  FaCircle,
  FaVenus,
  FaMars,
  FaNeuter,
  FaClock,
  FaTint,
  FaFire,
} from "react-icons/fa";
import { GiWoodenSign, GiIncense, GiFlowerPot } from "react-icons/gi";
import { IoMdCloseCircle } from "react-icons/io";
import { MdDarkMode, MdLocalFlorist } from "react-icons/md";
import { BsDroplet, BsStars } from "react-icons/bs";
import { TbDeer, TbMountain } from "react-icons/tb";

export const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number | string }>> = {
  "☕": FaCoffee,
  "🌙": FaMoon,
  "🌲": FaTree,
  "🏠": FaHome,
  "🍷": FaWineGlass,
  "🏖️": FaUmbrellaBeach,
  "❄️": FaSnowflake,
  "🎁": FaGift,
  "⚡": FaBolt,
  "🔍": FaSearch,
  "❤️": FaHeart,
  "✖️": IoMdCloseCircle,
  "⏭️": FaForward,
  "🫧": BsDroplet,
  "✨": BsStars,
  "💥": FaBomb,
  "🌞": FaSun,
  "🌜": FaMoon,
  "🗓️": FaCalendarDay,
  "🏞️": FaMountain,
  "🥒": FaLeaf,
  "🍊": FaLemon,
  "🌸": MdLocalFlorist,
  "🍎": FaApple,
  "🌶️": FaPepperHot,
  "🍯": FaGem,
  "🌿": FaLeaf,
  "🪔": GiIncense,
  "🌳": GiWoodenSign,
  "🌊": FaWater,
  "🪨": TbMountain,
  "🧴": FaSprayCan,
  "🦌": TbDeer,
  "💨": FaWind,
  "🍃": FaLeaf,
  "👜": FaBriefcase,
  "⚪": FaCircle,
  "👩": FaVenus,
  "👨": FaMars,
  "⚧️": FaNeuter,
  "⭕": FaCircle,
  "🕒": FaClock,
  "🌑": MdDarkMode,
  "🎨": BsStars,
  "👔": FaBriefcase,
  "🔥": FaFire,
};

export interface IconProps {
  emoji: string;
  className?: string;
  size?: number | string;
}

export function Icon({ emoji, className = "", size = "1em" }: IconProps) {
  const IconComponent = iconMap[emoji];
  if (!IconComponent) {
    return <span className={className}>{emoji}</span>;
  }
  return <IconComponent className={className} size={size} />;
}

