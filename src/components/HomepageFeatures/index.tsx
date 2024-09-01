import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  image: any;
  link: string;
  description: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'BackEnd',
    image: require('@site/static/img/backend.png').default,
    link: '/docs/category/backend',
    description: 'Tutoriais relacionados a backEnd - Criando API, Spring Boot, Java, Kotlin, etc',
  },
  {
    title: 'FrontEnd',
    image: require('@site/static/img/frontend.png').default,
    link: '/docs/category/frontend',
    description: 'Tutoriais de frontEnd - HTML, CSS, Bootstrap, JS, Angular, React, etc.'
  },
  {
    title: 'Geral',
    image: require('@site/static/img/geral.png').default,
    link: '/docs/category/geral',
    description: 'Totoriais gerais relacionados a deploy, containerização, infra, etc.'
  },
];

function Feature({title, image,link, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={image} style={{width: '100px', height:'100px'}}/>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <a href={link}>Acessar documentação de {title} {"->"}</a>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
