import styles from './ChristmasFrame.module.css';

/** One decorative frame for catalog, photo gallery and product information. */
export function ChristmasFrame(){
 return <span data-christmas-frame aria-hidden="true" className={styles.frame}>
  <span className={styles.pine}/>
  {['topLeft','topCenter','topRight','right','bottomRight','bottomCenter','bottomLeft','left'].map(position=><span key={position} className={`${styles.bulb} ${styles[position]}`}/>)}
 </span>;
}
